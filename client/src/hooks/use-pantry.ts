import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { 
  PantryResponse, 
  AddPantryItemRequest, 
  UpdatePantryItemRequest,
  UsePantryItemRequest,
  UsePantryItemResponse,
  PantrySuggestionsResponse,
  AutocompleteResponse,
  PantryAnalyticsResponse
} from '@/lib/types';

export function usePantry(filters?: { category?: string; status?: string; sort?: string }) {
  return useQuery<PantryResponse>({
    queryKey: ['pantry', filters?.category, filters?.status, filters?.sort],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.category && filters.category !== 'all') params.append('category', filters.category);
      if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters?.sort) params.append('sort', filters.sort);
      
      const response = await fetch(`/api/pantry?${params}`);
      if (!response.ok) throw new Error('Failed to fetch pantry items');
      return response.json();
    },
  });
}

export function useAddPantryItem() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
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
}

export function useUpdatePantryItem() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
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
}

export function useDeletePantryItem() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
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
}

export function useUsePantryItem() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UsePantryItemRequest }) => {
      const response = await fetch(`/api/pantry/${id}/use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to mark item as used');
      return response.json() as Promise<UsePantryItemResponse>;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['pantry'] });
      
      const { quantityUsed, newQuantity, previousQuantity } = result;
      
      if (quantityUsed > 0) {
        if (newQuantity === 0) {
          toast({ 
            title: 'Item Used Up', 
            description: `Used all remaining ${previousQuantity} units. Item is now empty.` 
          });
        } else {
          toast({ 
            title: 'Usage Recorded', 
            description: `Used ${quantityUsed} units. ${newQuantity} remaining.` 
          });
        }
      } else {
        toast({ title: 'Success', description: 'Item marked as used!' });
      }
    },
    onError: () => {
      toast({ 
        title: 'Error', 
        description: 'Failed to mark item as used',
        variant: 'destructive' 
      });
    },
  });
}

export function usePantrySuggestions(filters?: { prioritize?: string; meal_type?: string; limit?: number }) {
  return useQuery<PantrySuggestionsResponse>({
    queryKey: ['pantry-suggestions', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.prioritize) params.append('prioritize', filters.prioritize);
      if (filters?.meal_type) params.append('meal_type', filters.meal_type);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      
      const response = await fetch(`/api/pantry/suggestions?${params}`);
      if (!response.ok) throw new Error('Failed to fetch suggestions');
      return response.json();
    },
    enabled: false, // Only run when explicitly called
  });
}

export function usePantryAutocomplete(query: string) {
  return useQuery<AutocompleteResponse>({
    queryKey: ['pantry-autocomplete', query],
    queryFn: async () => {
      const response = await fetch(`/api/pantry/autocomplete?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Failed to fetch suggestions');
      return response.json();
    },
    enabled: query.length >= 2,
  });
}

export function usePantryAnalytics() {
  return useQuery<PantryAnalyticsResponse>({
    queryKey: ['pantry-analytics'],
    queryFn: async () => {
      const response = await fetch('/api/pantry/analytics');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch analytics');
      }
      return response.json();
    },
  });
}

export function useBulkAddPantryItems() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ items, source }: { items: AddPantryItemRequest[]; source?: string }) => {
      const response = await fetch('/api/pantry/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, source }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add items');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pantry'] });
      toast({ 
        title: 'Success', 
        description: `Added ${data.count} items to pantry!` 
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });
}
