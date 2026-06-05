export type OrganizationBranding = {
  id: string;
  slug: string;
  name: string;
  displayName: string;
  appTitle: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  supportEmail: string | null;
  customDomain: string | null;
};

export type MobileEvent = {
  workshopDateId: string;
  workshopSlug: string;
  workshopLabel: string;
  title: string | null;
  startsAt: string;
  isToday: boolean;
  isActive: boolean;
  registrationCount: number;
  checkedInCount: number;
  label: string;
};

export type RegistrationRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  checkedIn: boolean;
  checkedInAt: string | null;
  printStatus: string | null;
};

export type BootstrapResponse = {
  authenticated: boolean;
  email?: string;
  roles?: string[];
  orgRole?: string;
  permissions?: { staff: boolean; admin: boolean };
  organization?: OrganizationBranding;
};
