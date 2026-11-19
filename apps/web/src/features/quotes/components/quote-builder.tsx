// apps/web/src/features/quotes/components/QuoteBuilder.tsx
"use client";


import { useState } from "react";
// import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Save, Send } from "lucide-react";
import { calculateDocumentTotals, calculateLineCents, centsToString, DEFAULT_VAT_RATE } from "@/lib/money/cents";

// Updated type to match the database enum
type QuoteLineItemType = "part" | "labor" | "diagnostic" | "consumable" | "optional_service";

interface QuoteLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  type: QuoteLineItemType;
}

export function QuoteBuilder() {
  // const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [jobCardId, setJobCardId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [lineItems, setLineItems] = useState<QuoteLineItem[]>([
    {
      id: "1",
      description: "Example labor",
      quantity: 1,
      unitPrice: 150,
      total: 150,
      type: "labor",
    },
  ]);

  const addLineItem = () => {
    const newItem: QuoteLineItem = {
      id: Date.now().toString(),
      description: "",
      quantity: 1,
      unitPrice: 0,
      total: 0,
      type: "part",
    };
    setLineItems([...lineItems, newItem]);
  };

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  const updateLineItem = (id: string, field: keyof QuoteLineItem, value: string | number) => {
    setLineItems(
      lineItems.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === "quantity" || field === "unitPrice") {
            updated.total = calculateLineCents({ quantity: updated.quantity, unitPrice: updated.unitPrice }).subtotal / 100;
          }
          return updated;
        }
        return item;
      })
    );
  };

  const totals = calculateDocumentTotals(
    lineItems.map((item) => ({
      quantity: item.quantity,
      taxRate: DEFAULT_VAT_RATE,
      unitPrice: item.unitPrice,
    })),
  );

const handleSaveDraft = async () => {
  if (!jobCardId || !customerId) {
    toast.error("Please select a job card and customer");
    return;
  }

  setSaving(true);
  try {
    const response = await fetch("/api/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobCardId,
        customerId,
        lineItems: lineItems.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          type: item.type,
        })),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      toast.success("Quote created successfully!");
      // router.push(`/en/station/quotes/${data.quote.id}`); // TODO: Uncomment when quote detail page exists
      toast.info("Quote created! ID: " + data.quote.id);
    } else {
      const errorData = await response.json();
      toast.error(errorData.error || "Failed to create quote");
    }
  } catch {
    toast.error("An error occurred");
  } finally {
    setSaving(false);
  }
};

  const handleSendToCustomer = async () => {
    // First save as draft
    await handleSaveDraft();
    // Then send (this will be implemented in Week 3)
  };

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Quote Details */}
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Quote Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Job Card and Customer Selectors */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Job Card ID</label>
                <Input
                  placeholder="Select job card..."
                  value={jobCardId}
                  onChange={(e) => setJobCardId(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Customer</label>
                <Input
                  placeholder="Select customer..."
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-2">
              {lineItems.map((item) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4">
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) =>
                        updateLineItem(item.id, "description", e.target.value)
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                      value={item.type}
                      onChange={(e) =>
                        updateLineItem(item.id, "type", e.target.value as QuoteLineItemType)
                      }
                    >
                      <option value="part">Parts</option>
                      <option value="labor">Labor</option>
                      <option value="diagnostic">Diagnostics</option>
                      <option value="consumable">Consumables</option>
                      <option value="optional_service">Optional Service</option>
                    </select>
                  </div>
                  <div className="col-span-1">
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) =>
                        updateLineItem(item.id, "quantity", parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Price"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateLineItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <div className="font-medium">R {item.total.toFixed(2)}</div>
                  </div>
                  <div className="col-span-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeLineItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <Button onClick={addLineItem} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Quote Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-medium">R {centsToString(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax (15%):</span>
              <span className="font-medium">R {centsToString(totals.taxTotal)}</span>
            </div>
            <div className="flex justify-between border-t pt-4">
              <span className="font-bold">Total:</span>
              <span className="font-bold text-xl">R {centsToString(totals.total)}</span>
            </div>
            <div className="space-y-2 pt-4">
              <Button 
                className="w-full" 
                variant="default"
                onClick={handleSaveDraft}
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Draft"}
              </Button>
              <Button 
                className="w-full" 
                variant="default"
                onClick={handleSendToCustomer}
                disabled={saving}
              >
                <Send className="h-4 w-4 mr-2" />
                Send to Customer
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}