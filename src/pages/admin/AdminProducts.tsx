import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Upload, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import package1 from "@/assets/products/package-1.jpg";
import package2 from "@/assets/products/package-2.jpg";
import package3 from "@/assets/products/package-3.jpg";
import package4 from "@/assets/products/package-4.jpg";
import package5 from "@/assets/products/package-5.jpg";
import package6 from "@/assets/products/package-6.jpg";
import package7 from "@/assets/products/package-7.jpg";

const AdminProducts = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const productImages = [package1, package2, package3, package4, package5, package6, package7];
  
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    validityDays: '',
    dailyIncome: '',
    totalIncome: '',
    sortOrder: '',
  });

  const { data: exchangeRateSettings } = useQuery({
    queryKey: ['exchangeRateSettings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('setting_key', 'exchange_rate')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const ETB_TO_USDT_RATE = (exchangeRateSettings?.setting_value as any)?.etb_to_usdt || 170;

  const { data: products } = useQuery({
    queryKey: ['adminProducts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      let imageUrl = null;

      // Upload image if provided
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      const productData = {
        name: formData.name,
        price: parseFloat(formData.price),
        validity_days: parseInt(formData.validityDays),
        daily_income: parseFloat(formData.dailyIncome),
        total_income: parseFloat(formData.totalIncome),
        sort_order: parseInt(formData.sortOrder),
        ...(imageUrl && { image_url: imageUrl }),
      };

      if (editingId) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('products')
          .insert(productData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminProducts'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsDialogOpen(false);
      setEditingId(null);
      setImageFile(null);
      setImagePreview(null);
      setFormData({ name: '', price: '', validityDays: '', dailyIncome: '', totalIncome: '', sortOrder: '' });
      toast({ title: "Success", description: editingId ? "Product updated" : "Product added" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('products')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminProducts'] });
      toast({ title: "Success", description: "Product status updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminProducts'] });
      toast({ title: "Success", description: "Product deleted" });
    },
  });

  const handleEdit = (product: any) => {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      price: product.price.toString(),
      validityDays: product.validity_days.toString(),
      dailyIncome: product.daily_income.toString(),
      totalIncome: product.total_income.toString(),
      sortOrder: product.sort_order.toString(),
    });
    setImagePreview(product.image_url);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingId(null);
    setImageFile(null);
    setImagePreview(null);
    setFormData({ name: '', price: '', validityDays: '', dailyIncome: '', totalIncome: '', sortOrder: '0' });
    setIsDialogOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Products Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit' : 'Add'} Product</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="image">Product Image</Label>
                <div className="flex flex-col gap-3">
                  {imagePreview ? (
                    <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={removeImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Input
                        id="image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="flex-1"
                      />
                      <Upload className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (ETB)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validityDays">Validity (Days)</Label>
                  <Input
                    id="validityDays"
                    type="number"
                    value={formData.validityDays}
                    onChange={(e) => setFormData({ ...formData, validityDays: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dailyIncome">Daily Income (ETB)</Label>
                  <Input
                    id="dailyIncome"
                    type="number"
                    step="0.01"
                    value={formData.dailyIncome}
                    onChange={(e) => setFormData({ ...formData, dailyIncome: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalIncome">Total Income (ETB)</Label>
                  <Input
                    id="totalIncome"
                    type="number"
                    step="0.01"
                    value={formData.totalIncome}
                    onChange={(e) => setFormData({ ...formData, totalIncome: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {products?.map((product, index) => {
          const imageUrl = product.image_url || productImages[index] || productImages[0];
          const dailyIncomeUSDT = (Number(product.daily_income) / ETB_TO_USDT_RATE).toFixed(3);
          const totalIncomeUSDT = (Number(product.total_income) / ETB_TO_USDT_RATE).toFixed(2);
          return (
          <Card key={product.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4 flex-1">
                  <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                    <img 
                      src={imageUrl} 
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-lg">{product.name}</p>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={product.is_active}
                        onCheckedChange={(checked) => 
                          toggleActiveMutation.mutate({ id: product.id, isActive: checked })
                        }
                      />
                      <span className="text-sm text-muted-foreground">
                        {product.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Price: </span>
                      <span className="font-semibold">ETB {product.price}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Validity: </span>
                      <span className="font-semibold">{product.validity_days} days</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Daily: </span>
                      <span className="font-semibold">ETB {product.daily_income}</span>
                      <span className="text-xs text-emerald-400 ml-1">(${dailyIncomeUSDT})</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total: </span>
                      <span className="font-semibold">ETB {product.total_income}</span>
                      <span className="text-xs text-emerald-400 ml-1">(${totalIncomeUSDT})</span>
                    </div>
                  </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => handleEdit(product)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="icon"
                    onClick={() => deleteMutation.mutate(product.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )})}
      </div>
    </div>
  );
};

export default AdminProducts;
