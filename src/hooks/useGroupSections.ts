import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GroupSection {
  id: string;
  group_id: string;
  section_id: string;
  created_at: string;
  section?: {
    id: string;
    name: string;
    description: string | null;
  };
}

// Get sections assigned to a group
export const useGroupSections = (groupId?: string) => {
  return useQuery({
    queryKey: ['group-sections', groupId],
    queryFn: async () => {
      if (!groupId) return [];
      
      const { data, error } = await supabase
        .from('group_sections')
        .select(`
          id,
          group_id,
          section_id,
          created_at
        `)
        .eq('group_id', groupId);
      
      if (error) throw error;
      
      // Get section details
      const sectionsWithDetails = await Promise.all(
        (data || []).map(async (gs) => {
          const { data: section } = await supabase
            .from('sections')
            .select('id, name, description')
            .eq('id', gs.section_id)
            .single();
          
          return {
            ...gs,
            section: section || null,
          };
        })
      );
      
      return sectionsWithDetails as GroupSection[];
    },
    enabled: !!groupId,
  });
};

// Add section to group
export const useAddGroupSection = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ groupId, sectionId, createdBy }: { groupId: string; sectionId: string; createdBy?: string }) => {
      const { error } = await supabase
        .from('group_sections')
        .insert({
          group_id: groupId,
          section_id: sectionId,
          created_by: createdBy,
        });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group-sections', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['user-accessible-units'] });
    },
  });
};

// Remove section from group
export const useRemoveGroupSection = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ groupId, sectionId }: { groupId: string; sectionId: string }) => {
      const { error } = await supabase
        .from('group_sections')
        .delete()
        .eq('group_id', groupId)
        .eq('section_id', sectionId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group-sections', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['user-accessible-units'] });
    },
  });
};
