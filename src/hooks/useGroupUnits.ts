import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GroupUnit {
  id: string;
  group_id: string;
  unit_id: string;
  created_at: string;
  unit?: {
    id: string;
    name: string;
    level_id: string;
    level?: {
      id: string;
      name: string;
      section_id: string;
      section?: {
        id: string;
        name: string;
      };
    };
  };
}

// Get units assigned to a group
export const useGroupUnits = (groupId?: string) => {
  return useQuery({
    queryKey: ['group-units', groupId],
    queryFn: async () => {
      if (!groupId) return [];
      
      const { data, error } = await supabase
        .from('group_units')
        .select(`
          id,
          group_id,
          unit_id,
          created_at
        `)
        .eq('group_id', groupId);
      
      if (error) throw error;
      
      // Get unit details with level and section
      const unitsWithDetails = await Promise.all(
        (data || []).map(async (gu) => {
          const { data: unit } = await supabase
            .from('units')
            .select('id, name, level_id')
            .eq('id', gu.unit_id)
            .single();
          
          if (!unit) return { ...gu, unit: null };
          
          const { data: level } = await supabase
            .from('levels')
            .select('id, name, section_id')
            .eq('id', unit.level_id)
            .single();
          
          if (!level) return { ...gu, unit: { ...unit, level: null } };
          
          const { data: section } = await supabase
            .from('sections')
            .select('id, name')
            .eq('id', level.section_id)
            .single();
          
          return {
            ...gu,
            unit: {
              ...unit,
              level: {
                ...level,
                section: section || null,
              },
            },
          };
        })
      );
      
      return unitsWithDetails as GroupUnit[];
    },
    enabled: !!groupId,
  });
};

// Get all units a user has access to based on their group memberships
export const useUserAccessibleUnits = (userId?: string) => {
  return useQuery({
    queryKey: ['user-accessible-units', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('group_units')
        .select(`
          unit_id,
          group_id
        `);
      
      if (error) throw error;
      
      return (data || []).map(gu => gu.unit_id);
    },
    enabled: !!userId,
  });
};

// Add unit to group
export const useAddGroupUnit = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ groupId, unitId, createdBy }: { groupId: string; unitId: string; createdBy?: string }) => {
      const { error } = await supabase
        .from('group_units')
        .insert({
          group_id: groupId,
          unit_id: unitId,
          created_by: createdBy,
        });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group-units', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['user-accessible-units'] });
    },
  });
};

// Remove unit from group
export const useRemoveGroupUnit = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ groupId, unitId }: { groupId: string; unitId: string }) => {
      const { error } = await supabase
        .from('group_units')
        .delete()
        .eq('group_id', groupId)
        .eq('unit_id', unitId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group-units', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['user-accessible-units'] });
    },
  });
};

// Check if user has access to specific unit
export const useHasUnitAccess = (userId?: string, unitId?: string) => {
  return useQuery({
    queryKey: ['has-unit-access', userId, unitId],
    queryFn: async () => {
      if (!userId || !unitId) return false;
      
      const { data, error } = await supabase
        .rpc('user_has_unit_access', { _user_id: userId, _unit_id: unitId });
      
      if (error) {
        console.error('Error checking unit access:', error);
        return false;
      }
      
      return data as boolean;
    },
    enabled: !!userId && !!unitId,
  });
};
