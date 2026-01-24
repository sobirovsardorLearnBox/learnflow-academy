// Centralized React Query configuration for optimal caching
export const QUERY_STALE_TIMES = {
  // Static content - rarely changes
  sections: 5 * 60 * 1000, // 5 minutes
  levels: 5 * 60 * 1000,
  units: 5 * 60 * 1000,
  lessons: 3 * 60 * 1000, // 3 minutes
  
  // User-specific data - changes more frequently
  userProgress: 30 * 1000, // 30 seconds
  lessonProgress: 30 * 1000,
  unitProgress: 30 * 1000,
  userStats: 60 * 1000, // 1 minute
  
  // Batch progress (optimized queries)
  sectionProgress: 45 * 1000, // 45 seconds
  levelProgress: 45 * 1000,
  
  // Real-time sensitive
  notifications: 10 * 1000, // 10 seconds
  leaderboard: 30 * 1000, // 30 seconds
  
  // Admin/teacher data
  dashboardStats: 60 * 1000, // 1 minute
  attendance: 60 * 1000,
  payments: 60 * 1000,
  
  // Courses
  userCourses: 2 * 60 * 1000, // 2 minutes
} as const;

export const QUERY_GC_TIMES = {
  default: 5 * 60 * 1000, // 5 minutes
  userSpecific: 2 * 60 * 1000, // 2 minutes
  realtime: 60 * 1000, // 1 minute
  longLived: 10 * 60 * 1000, // 10 minutes for static content
} as const;

// Query key factory for consistent cache invalidation
export const queryKeys = {
  // Sections, Levels, Units
  sections: () => ['sections'] as const,
  levels: (sectionId?: string) => ['levels', sectionId] as const,
  units: (levelId?: string) => ['units', levelId] as const,
  
  // Lessons
  lessons: (unitId?: string) => ['lessons', unitId] as const,
  lesson: (lessonId?: string) => ['lesson', lessonId] as const,
  quizzes: (lessonId?: string) => ['quizzes', lessonId] as const,
  
  // Progress - standard
  lessonProgress: (userId?: string) => ['lesson_progress', userId] as const,
  unitProgress: (unitIds: string[], userId?: string) => ['unit_progress', unitIds, userId] as const,
  userProgress: (userId?: string) => ['user_progress', userId] as const,
  userStats: (userId?: string) => ['user_stats', userId] as const,
  lessonScores: (userId?: string) => ['lesson_scores', userId] as const,
  averageScore: (userId?: string) => ['average_score', userId] as const,
  
  // Progress - batch optimized
  sectionProgressBatch: (sectionIds: string[], userId?: string) => 
    ['section-progress-batch', sectionIds, userId] as const,
  levelProgressBatch: (levelIds: string[], userId?: string) => 
    ['level-progress-batch', levelIds, userId] as const,
  unitProgressBatch: (unitIds: string[], userId?: string) => 
    ['unit-progress-batch', unitIds, userId] as const,
  
  // User courses
  userCourses: (userId?: string) => ['user-courses-optimized', userId] as const,
  groupSectionsDetails: (groupId?: string) => ['group-sections-details', groupId] as const,
  
  // Leaderboard
  leaderboard: (groupId?: string, limit?: number, offset?: number) => 
    ['leaderboard', groupId, limit, offset] as const,
  groupLeaderboard: (groupId?: string) => ['group_leaderboard', groupId] as const,
  userRank: (userId?: string) => ['userRank', userId] as const,
  
  // Groups
  userGroups: (userId?: string) => ['user_groups', userId] as const,
  groups: () => ['groups'] as const,
  groupMembers: (groupId?: string) => ['group_members', groupId] as const,
  groupSections: (groupId?: string) => ['group-sections', groupId] as const,
  
  // Notifications
  notifications: (userId?: string) => ['notifications', userId] as const,
  notificationPreferences: (userId?: string) => ['notification_preferences', userId] as const,
  
  // Admin
  dashboardStats: () => ['dashboardStats'] as const,
  adminUsers: () => ['admin_users'] as const,
  adminStats: () => ['admin_stats'] as const,
  
  // All user-related queries (for batch invalidation on logout)
  allUserData: (userId?: string) => [
    ['lesson_progress', userId],
    ['unit_progress'],
    ['user_progress', userId],
    ['user_stats', userId],
    ['lesson_scores', userId],
    ['notifications', userId],
    ['section-progress-batch'],
    ['level-progress-batch'],
    ['unit-progress-batch'],
    ['user-courses-optimized', userId],
  ] as const,
} as const;

// Batch invalidation helpers
export const invalidationGroups = {
  // When a lesson is completed
  lessonComplete: (userId?: string) => [
    queryKeys.lessonProgress(userId),
    queryKeys.userStats(userId),
    queryKeys.lessonScores(userId),
    queryKeys.averageScore(userId),
    ['section-progress-batch'],
    ['level-progress-batch'],
    ['unit-progress-batch'],
  ],
  
  // When a unit is completed
  unitComplete: (userId?: string) => [
    ...invalidationGroups.lessonComplete(userId),
    ['unit_progress'],
    ['user_progress', userId],
    queryKeys.leaderboard(),
  ],
  
  // When user logs out
  userLogout: () => [
    'lesson_progress',
    'unit_progress',
    'user_progress',
    'user_stats',
    'lesson_scores',
    'notifications',
    'user_groups',
    'section-progress-batch',
    'level-progress-batch',
    'unit-progress-batch',
    'user-courses-optimized',
  ],
} as const;
