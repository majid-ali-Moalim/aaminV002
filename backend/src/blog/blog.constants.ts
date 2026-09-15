export const BLOG_CATEGORIES = [
  'Ambulance Services',
  'Emergency Medical Services',
  'First Aid Training',
  'Public Safety',
  'Emergency Management',
  'Community Awareness',
  'Aamin News',
  'General',
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];
