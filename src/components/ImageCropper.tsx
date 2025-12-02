import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Crop, X } from "lucide-react";

interface ImageCropperProps {
  imageFile: File;
  onCropComplete: (croppedBlob: Blob) => void;
  onCancel: () => void;
  open: boolean;
}

export const ImageCropper = ({ imageFile, onCropComplete, onCancel, open }: ImageCropperProps) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!imageFile || !open) return;

    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        setImage(img);
        // Initialize crop to center 80% of image
        const margin = 0.1;
        setCrop({
          x: img.width * margin,
          y: img.height * margin,
          width: img.width * (1 - 2 * margin),
          height: img.height * (1 - 2 * margin),
        });
      };
      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(imageFile);
  }, [imageFile, open]);

  useEffect(() => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to fit container
    const container = containerRef.current;
    if (!container) return;

    const maxWidth = container.clientWidth;
    const maxHeight = 500;
    
    let displayWidth = image.width;
    let displayHeight = image.height;
    
    // Scale to fit container
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
    displayWidth = image.width * scale;
    displayHeight = image.height * scale;

    canvas.width = displayWidth;
    canvas.height = displayHeight;

    // Draw image
    ctx.drawImage(image, 0, 0, displayWidth, displayHeight);

    // Draw crop overlay
    const scaleX = displayWidth / image.width;
    const scaleY = displayHeight / image.height;

    // Darken outside crop area
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // Clear crop area
    ctx.clearRect(
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY
    );

    // Redraw image in crop area
    ctx.drawImage(
      image,
      crop.x, crop.y, crop.width, crop.height,
      crop.x * scaleX, crop.y * scaleY, crop.width * scaleX, crop.height * scaleY
    );

    // Draw crop border
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY
    );

    // Draw corner handles
    const handleSize = 12;
    ctx.fillStyle = '#3b82f6';
    const corners = [
      { x: crop.x * scaleX, y: crop.y * scaleY },
      { x: (crop.x + crop.width) * scaleX, y: crop.y * scaleY },
      { x: crop.x * scaleX, y: (crop.y + crop.height) * scaleY },
      { x: (crop.x + crop.width) * scaleX, y: (crop.y + crop.height) * scaleY },
    ];

    corners.forEach(corner => {
      ctx.fillRect(
        corner.x - handleSize / 2,
        corner.y - handleSize / 2,
        handleSize,
        handleSize
      );
    });
  }, [image, crop]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !image) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = image.width / canvas.width;
    const scaleY = image.height / canvas.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setIsDragging(true);
    setDragStart({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !canvasRef.current || !image) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = image.width / canvas.width;
    const scaleY = image.height / canvas.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const newWidth = x - dragStart.x;
    const newHeight = y - dragStart.y;

    if (newWidth > 50 && newHeight > 50) {
      setCrop({
        x: Math.min(dragStart.x, x),
        y: Math.min(dragStart.y, y),
        width: Math.abs(newWidth),
        height: Math.abs(newHeight),
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCrop = () => {
    if (!image) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = crop.width;
    canvas.height = crop.height;

    ctx.drawImage(
      image,
      crop.x, crop.y, crop.width, crop.height,
      0, 0, crop.width, crop.height
    );

    canvas.toBlob((blob) => {
      if (blob) {
        onCropComplete(blob);
      }
    }, 'image/jpeg', 0.95);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crop className="h-5 w-5" />
            Crop Payment Screenshot
          </DialogTitle>
        </DialogHeader>
        
        <div ref={containerRef} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Drag on the image to select the area you want to keep. This helps reduce file size.
          </p>
          
          {image && (
            <div className="relative border rounded-lg overflow-hidden bg-muted/50">
              <canvas
                ref={canvasRef}
                className="max-w-full cursor-crosshair"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleCrop}>
            <Crop className="h-4 w-4 mr-2" />
            Apply Crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
