import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Filter, Calendar, Trash2, Edit3, Package, ChefHat } from 'lucide-react';
import type { 
  PantryItem, 
  PantryResponse, 
  AddPantryItemRequest, 
  UpdatePantryItemRequest,
  PantryCategory,
  QuantityStatus,
  AutocompleteResponse 
} from '@/lib/types';

interface AddItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (item: AddPantryItemRequest) => void;
}

function AddItemModal({ open, onOpenChange, onAdd }: AddItemModalProps) {
  const [formData, setFormData] = useState<AddPantryItemRequest>({
    name: '',
    category: undefined,
    quantity: undefined,
    unit: '',
    estimatedShelfLifeDays: undefined,
    notes: '',
    isStaple: false,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<AutocompleteResponse['suggestions']>([]);

  // Autocomplete search
  useEffect(() => {
    if (searchTerm.length >= 2) {
      fetch(`/api/pantry/autocomplete?q=${encodeURIComponent(searchTerm)}`)
        .then(res => res.json())
        .then(data => setSuggestions(data.suggestions || []))
        .catch(console.error);
    } else {
      setSuggestions([]);
    }
  }, [searchTerm]);

  const handleSuggestionSelect = (suggestion: AutocompleteResponse['suggestions'][0]) => {
    setFormData(prev => ({
      ...prev,
      name: suggestion.name,
      category: suggestion.category as PantryCategory,
      estimatedShelfLifeDays: suggestion.typicalShelfLife || undefined,
      unit: suggestion.commonUnits[0] || ''
    }));
    setSearchTerm(suggestion.name);
    setSuggestions([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    onAdd(formData);
    setFormData({
      name: '',
      category: undefined,
      quantity: undefined,
      unit: '',
      estimatedShelfLifeDays: undefined,
      notes: '',
      isStaple: false,
    });
    setSearchTerm('');
    onOpenChange(false);
  };

  const categories: PantryCategory[] = [
    'produce', 'dairy', 'meat', 'pantry', 'frozen', 'condiments', 'spices', 'beverages', 'other'
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Pantry Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Item Name</Label>
            <Input
              id="name"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setFormData(prev => ({ ...prev, name: e.target.value }));
              }}
              placeholder="Start typing to search..."
              required
            />
            {suggestions.length > 0 && (
              <div className="border rounded-md mt-1 bg-background">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-muted text-sm border-b last:border-b-0"
                    onClick={() => handleSuggestionSelect(suggestion)}
                  >
                    <div className="font-medium">{suggestion.name}</div>
                    <div className="text-muted-foreground text-xs">
                      {suggestion.category} • {suggestion.commonUnits.join(', ')}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category} onValueChange={(value: PantryCategory) => setFormData(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                placeholder="lbs, cups, pieces..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              step="0.1"
              min="0"
              value={formData.quantity || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value ? parseFloat(e.target.value) : undefined }))}
              placeholder="How much do you have?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any additional notes..."
              rows={2}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="staple"
              checked={formData.isStaple}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isStaple: !!checked }))}
            />
            <Label htmlFor="staple" className="text-sm">
              This is a staple item (always keep in stock)
            </Label>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Add Item
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface PantryItemCardProps {
  item: PantryItem;
  onUpdate: (id: number, data: UpdatePantryItemRequest) => void;
  onDelete: (id: number) => void;
  onUse: (id: number) => void;
}

function PantryItemCard({ item, onUpdate, onDelete, onUse }: PantryItemCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    quantity: item.quantity || 0,
    quantityStatus: item.quantity_status,
    notes: item.user_notes || '',
  });

  const daysOld = Math.floor((Date.now() - new Date(item.added_date).getTime()) / (1000 * 60 * 60 * 24));
  
  const getStatusColor = (status: QuantityStatus) => {
    switch (status) {
      case 'full': return 'bg-green-100 text-green-800';
      case 'half': return 'bg-yellow-100 text-yellow-800';
      case 'running_low': return 'bg-orange-100 text-orange-800';
      case 'empty': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAgeColor = (days: number) => {
    if (days >= 7) return 'text-orange-600';
    if (days >= 3) return 'text-yellow-600';
    return 'text-green-600';
  };

  const handleSave = () => {
    onUpdate(item.id, editData);
    setIsEditing(false);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{item.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {item.category || 'other'}
              </Badge>
              {item.is_staple && (
                <Badge variant="secondary" className="text-xs">Staple</Badge>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(item.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-3 border-t pt-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Quantity</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={editData.quantity}
                  onChange={(e) => setEditData(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select 
                  value={editData.quantityStatus} 
                  onValueChange={(value: QuantityStatus) => setEditData(prev => ({ ...prev, quantityStatus: value }))}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full</SelectItem>
                    <SelectItem value="half">Half</SelectItem>
                    <SelectItem value="running_low">Running Low</SelectItem>
                    <SelectItem value="empty">Empty</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea
                value={editData.notes}
                onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                className="h-16 text-sm"
                placeholder="Add notes..."
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} className="flex-1">Save</Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="flex-1">Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {item.quantity} {item.unit}
              </span>
              <Badge className={`text-xs ${getStatusColor(item.quantity_status)}`}>
                {item.quantity_status.replace('_', ' ')}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className={getAgeColor(daysOld)}>
                Added {daysOld === 0 ? 'today' : `${daysOld} days ago`}
              </span>
              {item.last_used_date && (
                <span>
                  Last used {Math.floor((Date.now() - new Date(item.last_used_date).getTime()) / (1000 * 60 * 60 * 24))} days ago
                </span>
              )}
            </div>

            {item.user_notes && (
              <p className="text-sm text-muted-foreground mt-2 p-2 bg-muted rounded">
                {item.user_notes}
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => onUse(item.id)}
                className="flex-1"
              >
                <ChefHat className="h-3 w-3 mr-1" />
                Mark as Used
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function MyPantry() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pantry items
  const { data: pantryData, isLoading } = useQuery<PantryResponse>({
    queryKey: ['pantry', categoryFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const response = await fetch(`/api/pantry?${params}`);
      if (!response.ok) throw new Error('Failed to fetch pantry items');
      return response.json();
    },
  });

  // Add item mutation
  const addItemMutation = useMutation({
    mutationFn: async (item: AddPantryItemRequest) => {
      const response = await fetch('/api/pantry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add item');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pantry'] });
      toast({ title: 'Success', description: 'Item added to pantry!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Update item mutation
  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdatePantryItemRequest }) => {
      const response = await fetch(`/api/pantry/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update item');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pantry'] });
      toast({ title: 'Success', description: 'Item updated!' });
    },
    onError: () => {
      toast({ 
        title: 'Error', 
        description: 'Failed to update item',
        variant: 'destructive' 
      });
    },
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/pantry/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete item');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pantry'] });
      toast({ title: 'Success', description: 'Item removed from pantry!' });
    },
    onError: () => {
      toast({ 
        title: 'Error', 
        description: 'Failed to remove item',
        variant: 'destructive' 
      });
    },
  });

  // Use item mutation
  const useItemMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/pantry/${id}/use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error('Failed to mark item as used');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pantry'] });
      toast({ title: 'Success', description: 'Item marked as used!' });
    },
    onError: () => {
      toast({ 
        title: 'Error', 
        description: 'Failed to mark item as used',
        variant: 'destructive' 
      });
    },
  });

  const filteredItems = pantryData?.items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const useSoonItems = filteredItems.filter(item => {
    const daysOld = Math.floor((Date.now() - new Date(item.added_date).getTime()) / (1000 * 60 * 60 * 24));
    return daysOld >= 7 || item.quantity_status === 'running_low';
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">MyPantry</h1>
          <p className="text-muted-foreground mt-1">
            Track your ingredients and reduce food waste
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Stats Cards */}
      {pantryData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Package className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{pantryData.totalItems}</p>
                  <p className="text-sm text-muted-foreground">Total Items</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold">{useSoonItems.length}</p>
                  <p className="text-sm text-muted-foreground">Use Soon</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <ChefHat className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{pantryData.categories.length}</p>
                  <p className="text-sm text-muted-foreground">Categories</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {pantryData?.categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="full">Full</SelectItem>
                  <SelectItem value="half">Half</SelectItem>
                  <SelectItem value="running_low">Running Low</SelectItem>
                  <SelectItem value="empty">Empty</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Use Soon Items */}
      {useSoonItems.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-600" />
            Use Soon ({useSoonItems.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {useSoonItems.slice(0, 6).map(item => (
              <PantryItemCard
                key={item.id}
                item={item}
                onUpdate={(id, data) => updateItemMutation.mutate({ id, data })}
                onDelete={(id) => deleteItemMutation.mutate(id)}
                onUse={(id) => useItemMutation.mutate(id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Items */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          All Items ({filteredItems.length})
        </h2>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-3 bg-muted rounded mb-4 w-2/3"></div>
                  <div className="h-8 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No items found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'Try adjusting your search or filters.' : 'Start by adding your first pantry item!'}
              </p>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Item
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map(item => (
              <PantryItemCard
                key={item.id}
                item={item}
                onUpdate={(id, data) => updateItemMutation.mutate({ id, data })}
                onDelete={(id) => deleteItemMutation.mutate(id)}
                onUse={(id) => useItemMutation.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      <AddItemModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onAdd={(item) => addItemMutation.mutate(item)}
      />
    </div>
  );
}
