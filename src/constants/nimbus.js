export const BEARING_ANGLES = {
  Retention: 0,
  Growth: 72,
  'Tech Debt': 144,
  'AI/Automation': 216,
  'Enterprise/Compliance': 288,
};

export const FEATURES = [
  { name: 'Smart Notification Digest', ownerPm: 'Maya Chen', theme: 'Retention' },
  { name: 'Bulk Export to CSV/Excel', ownerPm: 'Maya Chen', theme: 'Retention' },
  { name: 'Custom Dashboard Builder', ownerPm: 'Maya Chen', theme: 'Retention' },
  { name: 'Real-Time Collaboration Cursors', ownerPm: 'Maya Chen', theme: 'Retention' },
  { name: 'In-App Onboarding Checklist', ownerPm: 'Jordan Patel', theme: 'Growth' },
  { name: 'Dark Mode', ownerPm: 'Jordan Patel', theme: 'Growth' },
  { name: 'Slack/Teams Integration', ownerPm: 'Jordan Patel', theme: 'Growth' },
  { name: 'Mobile Offline Mode', ownerPm: 'Jordan Patel', theme: 'Growth' },
  { name: 'Multi-Currency Billing', ownerPm: 'Jordan Patel', theme: 'Growth' },
  { name: 'Legacy Auth Migration', ownerPm: 'Sam Okafor', theme: 'Tech Debt' },
  { name: 'Database Sharding Migration', ownerPm: 'Sam Okafor', theme: 'Tech Debt' },
  { name: 'API Rate-Limit Overhaul', ownerPm: 'Sam Okafor', theme: 'Tech Debt' },
  { name: 'AI Meeting Summarizer', ownerPm: 'Priya Raman', theme: 'AI/Automation' },
  { name: 'Guided AI Setup Assistant', ownerPm: 'Priya Raman', theme: 'AI/Automation' },
  { name: 'AI Report Narration', ownerPm: 'Priya Raman', theme: 'AI/Automation' },
  { name: 'Predictive Churn Scoring', ownerPm: 'Priya Raman', theme: 'AI/Automation' },
  { name: 'SSO / SCIM Provisioning', ownerPm: 'Alex Whitfield', theme: 'Enterprise/Compliance' },
  { name: 'Audit Log Export', ownerPm: 'Alex Whitfield', theme: 'Enterprise/Compliance' },
  { name: 'Role-Based Permissions v2', ownerPm: 'Alex Whitfield', theme: 'Enterprise/Compliance' },
  { name: 'Webhook Marketplace', ownerPm: 'Alex Whitfield', theme: 'Enterprise/Compliance' },
];

export const PMS = ['Maya Chen', 'Jordan Patel', 'Sam Okafor', 'Priya Raman', 'Alex Whitfield'];

export function getBearingAngle(featureName) {
  const feature = FEATURES.find((f) => f.name === featureName);
  return feature ? BEARING_ANGLES[feature.theme] : 0;
}

export const TYPE_COLORS = {
  blocker: { border: 'border-danger', text: 'text-danger' },
  'feature request': { border: 'border-accent', text: 'text-accent' },
  praise: { border: 'border-success', text: 'text-success' },
  confusion: { border: 'border-muted', text: 'text-muted' },
  workaround: { border: 'border-muted', text: 'text-muted' },
};