import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface RechargeApprovalCardProps {
  recharge: any;
  onApprove: (rechargeId: string, userType: 'promoter' | 'investor') => void;
  onReject: (rechargeId: string) => void;
  isLoading: boolean;
}

const RechargeApprovalCard = ({ recharge, onApprove, onReject, isLoading }: RechargeApprovalCardProps) => {
  const [selectedUserType, setSelectedUserType] = useState<'promoter' | 'investor'>('investor');

  return (
    <Card className="shadow-card">
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-col gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-lg">{recharge.profile?.phone_number || 'Unknown User'}</p>
              <Badge>Pending</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{recharge.products?.name}</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Amount: </span>
                <span className="font-bold text-primary">ETB {recharge.amount}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Date: </span>
                <span>{format(new Date(recharge.created_at), 'MMM dd, yyyy HH:mm')}</span>
              </div>
            </div>
            {recharge.payer_account_name && (
              <div className="mt-2 p-2 bg-muted rounded-md">
                <div>
                  <span className="text-xs text-muted-foreground">Payer Info: </span>
                  <span className="text-sm">{recharge.payer_account_name}</span>
                </div>
              </div>
            )}
            {recharge.payment_proof_url && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    <ImageIcon className="h-4 w-4 mr-2" />
                    View Payment Screenshot
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Payment Screenshot</DialogTitle>
                  </DialogHeader>
                  <img
                    src={recharge.payment_proof_url}
                    alt="Payment proof"
                    className="w-full h-auto rounded-lg"
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">User Type</label>
              <Select value={selectedUserType} onValueChange={(value: 'promoter' | 'investor') => setSelectedUserType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="investor">Investor</SelectItem>
                  <SelectItem value="promoter">Promoter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2 w-full">
              <Button 
                size="sm"
                className="flex-1"
                onClick={() => onApprove(recharge.id, selectedUserType)}
                disabled={isLoading}
              >
                <Check className="h-4 w-4 mr-1" /> Approve as {selectedUserType}
              </Button>
              <Button 
                size="sm" 
                variant="destructive"
                className="flex-1"
                onClick={() => onReject(recharge.id)}
                disabled={isLoading}
              >
                <X className="h-4 w-4 mr-1" /> Reject
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RechargeApprovalCard;
