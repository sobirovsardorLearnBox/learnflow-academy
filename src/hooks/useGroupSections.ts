import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { QUERY_STALE_TIMES, QUERY_GC_TIMES } from '@/lib/query-config';

export interface GroupSection {
  id: string;
  group_id: string;
  section_id: string;
  created_at: string;
  section?: {
    id: string;
    name: string;
    description: string | null;
    icon?: string | null;
    display_order?: number;
  };
}

// Get sections assigned to a group - OPTIMIZED with JOIN
export const useGroupSections = (groupId?: string) => {
  return useQuery({
    queryKey: ['group-sections', groupId],
    queryFn: async () => {
      if (!groupId) return [];
      
      // Single query with JOIN instead of N+1
      const { data, error } = await supabase
        .from('group_sections')
        .select(`
          id,
          group_id,
          section_id,
          created_at,
          sections (
            id,
            name,
            description,
            icon,
            display_order
          )
        `)
        .eq('group_id', groupId);
      
      if (error) throw error;
      
      // Transform to expected format
      return (data || []).map(gs => ({
        id: gs.id,
        group_id: gs.group_id,
        section_id: gs.section_id,
        created_at: gs.created_at,
        section: gs.sections ? {
          id: (gs.sections as any).id,
          name: (gs.sections as any).name,
          description: (gs.sections as any).description,
          icon: (gs.sections as any).icon,
          display_order: (gs.sections as any).display_order,
        } : undefined,
      })) as GroupSection[];
    },
    enabled: !!groupId,
    staleTime: QUERY_STALE_TIMES.sections,
    gcTime: QUERY_GC_TIMES.default,
  });
};

// Get group sections with full section details - for MyCourses page
export const useGroupSectionsWithDetails = (groupId?: string) => {
  return useQuery({
    queryKey: ['group-sections-details', groupId],
    queryFn: async () => {
      if (!groupId) return [];
      
      const { data, error } = await supabase
        .from('group_sections')
        .select(`
          section_id,
          sections!inner (
            id,
            name,
            description,
            icon,
            display_order,
            is_active
          )
        `)
        .eq('group_id', groupId);
      
      if (error) throw error;
      
      // Return sections ordered by display_order
      return (data || [])
        .filter(gs => (gs.sections as any)?.is_active)
        .map(gs => ({
          id: (gs.sections as any).id,
          name: (gs.sections as any).name,
          description: (gs.sections as any).description,
          icon: (gs.sections as any).icon,
          display_order: (gs.sections as any).display_order || 0,
        }))
        .sort((a, b) => a.display_order - b.display_order);
    },
    enabled: !!groupId,
    staleTime: QUERY_STALE_TIMES.sections,
    gcTime: QUERY_GC_TIMES.default,
  });
};

// Get all section IDs a user has access to based on their group memberships - OPTIMIZED
export const useUserAccessibleSections = (userId?: string) => {
  return useQuery({
    queryKey: ['user-accessible-sections', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      // Get approved group memberships
      const { data: memberships, error: membershipError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId)
        .eq('is_approved', true);
      
      if (membershipError) throw membershipError;
      if (!memberships || memberships.length === 0) return [];
      
      const groupIds = memberships.map(m => m.group_id);
      
      // Get all sections in these groups in one query
      const { data: groupSections, error: sectionsError } = await supabase
        .from('group_sections')
        .select('section_id')
        .in('group_id', groupIds);
      
      if (sectionsError) throw sectionsError;
      
      // Return unique section IDs
      return [...new Set((groupSections || []).map(gs => gs.section_id))];
    },
    enabled: !!userId,
    staleTime: QUERY_STALE_TIMES.sections,
    gcTime: QUERY_GC_TIMES.default,
  });
};

// Get all unit IDs a user has access to - OPTIMIZED with batch queries
export const useUserAccessibleUnits = (userId?: string) => {
  return useQuery({
    queryKey: ['user-accessible-units', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      // Step 1: Get approved group memberships
      const { data: memberships, error: membershipError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId)
        .eq('is_approved', true);
      
      if (membershipError) throw membershipError;
      if (!memberships || memberships.length === 0) return [];
      
      const groupIds = memberships.map(m => m.group_id);
      
      // Step 2: Get sections in these groups
      const { data: groupSections, error: sectionsError } = await supabase
        .from('group_sections')
        .select('section_id')
        .in('group_id', groupIds);
      
      if (sectionsError) throw sectionsError;
      if (!groupSections || groupSections.length === 0) return [];
      
      const sectionIds = [...new Set(groupSections.map(gs => gs.section_id))];
      
      // Step 3: Get levels in these sections
      const { data: levels, error: levelsError } = await supabase
        .from('levels')
        .select('id')
        .in('section_id', sectionIds)
        .eq('is_active', true);
      
      if (levelsError) throw levelsError;
      if (!levels || levels.length === 0) return [];
      
      const levelIds = levels.map(l => l.id);
      
      // Step 4: Get units in these levels
      const { data: units, error: unitsError } = await supabase
        .from('units')
        .select('id')
        .in('level_id', levelIds)
        .eq('is_active', true);
      
      if (unitsError) throw unitsError;
      
      return (units || []).map(u => u.id);
    },
    enabled: !!userId,
    staleTime: QUERY_STALE_TIMES.units,
    gcTime: QUERY_GC_TIMES.default,
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
      queryClient.invalidateQueries({ queryKey: ['group-sections-details', variables.groupId] });
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
      queryClient.invalidateQueries({ queryKey: ['group-sections-details', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['user-accessible-units'] });
      queryClient.invalidateQueries({ queryKey: ['user-accessible-sections'] });
    },
  });
};
