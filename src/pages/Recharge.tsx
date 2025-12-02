import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Copy, ArrowLeft, CheckCircle, Upload, X } from "lucide-react";
import Layout from "@/components/Layout";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { compressImage, formatFileSize } from "@/lib/imageCompression";

const Recharge = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('product');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payerAccountNumber, setPayerAccountNumber] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<{ original: number; compressed: number } | null>(null);

  const { data: product } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      if (!productId) return null;
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });

  const { data: adminBank } = useQuery({
    queryKey: ['adminBank'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_bank_info')
        .select('*')
        .eq('is_active', true)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: userBankAccount } = useQuery({
    queryKey: ['userBankAccount', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      
      // Auto-fill the account number when bank account is loaded
      if (data && !payerAccountNumber) {
        setPayerAccountNumber(data.account_number);
      }
      
      return data;
    },
    enabled: !!user,
  });

  const createRechargeMutation = useMutation({
    mutationFn: async () => {
      if (!product || !user) throw new Error('Missing data');
      if (!payerAccountNumber.trim()) throw new Error('Please enter payer account number');
      if (!buyerName.trim()) throw new Error('Please enter buyer name');
      if (!paymentScreenshot) throw new Error('Please upload payment screenshot');

      // Upload screenshot to storage
      const fileExt = paymentScreenshot.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, paymentScreenshot);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      const { error } = await supabase
        .from('recharges')
        .insert({
          user_id: user.id,
          product_id: product.id,
          amount: product.price,
          status: 'pending',
          payer_account_name: `${buyerName.trim()} (${payerAccountNumber.trim()})`,
          payment_proof_url: publicUrl,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recharges'] });
      toast({
        title: "Success!",
        description: "Your recharge request has been submitted. Please wait for admin approval.",
      });
      setBuyerName("");
      setPayerAccountNumber("");
      setPaymentScreenshot(null);
      setScreenshotPreview(null);
      navigate('/');
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await createRechargeMutation.mutateAsync();
    setIsSubmitting(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      const originalSize = file.size;

      // Check if file is too large
      if (originalSize > 10 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "File size must be less than 10MB",
          variant: "destructive",
        });
        setIsCompressing(false);
        return;
      }

      // Compress the image
      const compressedBlob = await compressImage(file, 1200, 1200, 0.8);
      const compressedFile = new File([compressedBlob], file.name, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });

      const compressedSize = compressedFile.size;
      
      // Store compression info
      setCompressionInfo({ original: originalSize, compressed: compressedSize });
      
      // Show success message if compression was significant
      if (originalSize > compressedSize) {
        const savedPercent = Math.round(((originalSize - compressedSize) / originalSize) * 100);
        toast({
          title: "Image compressed",
          description: `Reduced by ${savedPercent}% (${formatFileSize(originalSize)} → ${formatFileSize(compressedSize)})`,
        });
      }

      setPaymentScreenshot(compressedFile);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
        setIsCompressing(false);
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error('Error compressing image:', error);
      toast({
        title: "Compression failed",
        description: "Using original image instead",
        variant: "destructive",
      });
      
      // Use original file if compression fails
      setPaymentScreenshot(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
        setIsCompressing(false);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!product) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto p-4">
          <Card className="shadow-card">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No product selected</p>
              <Button onClick={() => navigate('/products')} className="mt-4">
                View Products
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-lg mx-auto p-4 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Recharge</h1>
            <p className="text-sm text-muted-foreground">Complete your payment</p>
          </div>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Product Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Product:</span>
              <span className="font-semibold">{product.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-bold text-primary text-xl">ETB {product.price}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Validity:</span>
              <span className="font-semibold">{product.validity_days} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Daily Income:</span>
              <span className="font-semibold text-secondary">ETB {product.daily_income}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-elevated bg-gradient-primary">
          <CardHeader>
            <CardTitle className="text-lg text-white">Payment Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {adminBank && (
              <div className="space-y-3 bg-white/10 backdrop-blur-sm rounded-lg p-4">
                {adminBank.account_type === 'bank' && (
                  <div className="space-y-2">
                    <p className="text-sm text-white/80">Bank Name</p>
                    <div className="flex items-center justify-between bg-white/20 rounded p-2">
                      <span className="text-white font-semibold">{adminBank.bank_name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(adminBank.bank_name, 'Bank name')}
                        className="text-white hover:bg-white/20"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-sm text-white/80">
                    {adminBank.account_type === 'telebirr' ? 'Telebirr Account Name' : 'Account Name'}
                  </p>
                  <div className="flex items-center justify-between bg-white/20 rounded p-2">
                    <span className="text-white font-semibold">{adminBank.account_name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(adminBank.account_name, 'Account name')}
                      className="text-white hover:bg-white/20"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-white/80">
                    {adminBank.account_type === 'telebirr' ? 'Telebirr Number' : 'Account Number'}
                  </p>
                  <div className="flex items-center justify-between bg-white/20 rounded p-2">
                    <span className="text-white font-semibold">
                      {adminBank.account_type === 'telebirr' ? `+251${adminBank.account_number}` : adminBank.account_number}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(
                        adminBank.account_type === 'telebirr' ? `+251${adminBank.account_number}` : adminBank.account_number,
                        adminBank.account_type === 'telebirr' ? 'Telebirr number' : 'Account number'
                      )}
                      className="text-white hover:bg-white/20"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2 text-white/90 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>Transfer the exact amount to the account above</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>Confirm your payer account number</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>Wait for admin approval (usually within 24 hours)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="buyer-name" className="text-base font-semibold">
                Buyer Name *
              </Label>
              <Input
                id="buyer-name"
                type="text"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Enter buyer name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payer-account" className="text-base font-semibold">
                Payer Account Number *
              </Label>
              <Input
                id="payer-account"
                type="text"
                value={payerAccountNumber}
                onChange={(e) => setPayerAccountNumber(e.target.value)}
                placeholder="Enter payer account number"
                required
              />
              {userBankAccount && (
                <p className="text-xs text-muted-foreground">
                  Auto-filled from your saved bank account. You can edit if needed.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="screenshot" className="text-base font-semibold">
                Payment Screenshot *
              </Label>
              {compressionInfo && (
                <p className="text-xs text-muted-foreground">
                  Compressed: {formatFileSize(compressionInfo.original)} → {formatFileSize(compressionInfo.compressed)}
                </p>
              )}
              <div className="space-y-3">
                {isCompressing ? (
                  <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-primary/30 rounded-lg bg-muted/50">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mb-2"></div>
                      <p className="text-sm text-muted-foreground">Compressing image...</p>
                    </div>
                  </div>
                ) : screenshotPreview ? (
                  <div className="relative">
                    <img
                      src={screenshotPreview}
                      alt="Payment screenshot"
                      className="w-full h-48 object-cover rounded-lg border-2 border-primary/20"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setPaymentScreenshot(null);
                        setScreenshotPreview(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label
                    htmlFor="screenshot"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-primary/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        <span className="font-semibold">Click to upload</span> payment screenshot
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
                    </div>
                  </label>
                )}
                <Input
                  id="screenshot"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  required={!paymentScreenshot}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !payerAccountNumber.trim() || !buyerName.trim() || !paymentScreenshot}
          className="w-full h-12 text-lg"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Payment Request'}
        </Button>
      </div>
    </Layout>
  );
};

export default Recharge;
