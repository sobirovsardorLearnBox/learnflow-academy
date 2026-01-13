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

// Get all section IDs a user has access to based on their group memberships
export const useUserAccessibleSections = (userId?: string) => {
  return useQuery({
    queryKey: ['user-accessible-sections', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      // Get all groups user is an approved member of
      const { data: memberships, error: membershipError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId)
        .eq('is_approved', true);
      
      if (membershipError) throw membershipError;
      
      if (!memberships || memberships.length === 0) return [];
      
      const groupIds = memberships.map(m => m.group_id);
      
      // Get all sections assigned to user's groups
      const { data: groupSections, error: sectionsError } = await supabase
        .from('group_sections')
        .select('section_id')
        .in('group_id', groupIds);
      
      if (sectionsError) throw sectionsError;
      
      // Return unique section IDs
      const sectionIds = [...new Set((groupSections || []).map(gs => gs.section_id))];
      return sectionIds;
    },
    enabled: !!userId,
  });
};

// Get all unit IDs a user has access to based on their group section assignments
export const useUserAccessibleUnits = (userId?: string) => {
  return useQuery({
    queryKey: ['user-accessible-units', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      // Get all groups user is an approved member of
      const { data: memberships, error: membershipError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId)
        .eq('is_approved', true);
      
      if (membershipError) throw membershipError;
      
      if (!memberships || memberships.length === 0) return [];
      
      const groupIds = memberships.map(m => m.group_id);
      
      // Get all sections assigned to user's groups
      const { data: groupSections, error: sectionsError } = await supabase
        .from('group_sections')
        .select('section_id')
        .in('group_id', groupIds);
      
      if (sectionsError) throw sectionsError;
      
      if (!groupSections || groupSections.length === 0) return [];
      
      const sectionIds = [...new Set(groupSections.map(gs => gs.section_id))];
      
      // Get all levels in these sections
      const { data: levels, error: levelsError } = await supabase
        .from('levels')
        .select('id')
        .in('section_id', sectionIds);
      
      if (levelsError) throw levelsError;
      
      if (!levels || levels.length === 0) return [];
      
      const levelIds = levels.map(l => l.id);
      
      // Get all units in these levels
      const { data: units, error: unitsError } = await supabase
        .from('units')
        .select('id')
        .in('level_id', levelIds);
      
      if (unitsError) throw unitsError;
      
      return (units || []).map(u => u.id);
    },
    enabled: !!userId,
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
      queryClient.invalidateQueries({ queryKey: ['user-accessible-sections'] });
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
      queryClient.invalidateQueries({ queryKey: ['user-accessible-sections'] });
    },
  });
};
