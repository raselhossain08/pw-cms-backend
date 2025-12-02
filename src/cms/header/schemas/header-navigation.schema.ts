import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type HeaderNavigationDocument = HeaderNavigation & Document;

@Schema()
class Logo {
  @Prop({ required: true })
  dark: string;

  @Prop({ required: true })
  light: string;

  @Prop({ required: true })
  alt: string;
}

@Schema()
class Cart {
  @Prop({ required: true, default: '/cart' })
  href: string;
}

@Schema()
class SearchConfig {
  @Prop({ required: true, default: 'What are you looking for?' })
  placeholder: string;

  @Prop({ required: true, default: 'Search' })
  buttonText: string;

  @Prop({ required: true, default: 10 })
  resultsPerPage: number;
}

@Schema()
class NavigationLink {
  @Prop({ required: true })
  text: string;

  @Prop({ required: true })
  href: string;

  @Prop({ required: true })
  icon: string;

  @Prop({ required: true })
  description: string;

  @Prop()
  badge?: string;
}

@Schema()
class Submenu {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  icon: string;

  @Prop({ type: [NavigationLink], required: true })
  links: NavigationLink[];
}

@Schema()
class FeaturedCourse {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  image: string;

  @Prop({ required: true })
  href: string;

  @Prop({ required: true })
  badge: string;
}

@Schema()
class MenuItem {
  @Prop({ required: true })
  title: string;

  @Prop()
  href?: string;

  @Prop({ required: true })
  hasDropdown: boolean;

  @Prop({ required: true })
  icon: string;

  @Prop()
  description?: string;

  @Prop({ type: FeaturedCourse })
  featured?: FeaturedCourse;

  @Prop({ type: [Submenu] })
  submenus?: Submenu[];
}

@Schema()
class Navigation {
  @Prop({ type: [MenuItem], required: true })
  menuItems: MenuItem[];
}

@Schema()
class UserProfile {
  @Prop({ required: true, default: 'U' })
  avatarFallback: string;

  @Prop({ required: true, default: '/profile' })
  profileLink: string;
}

@Schema()
class UserMenuItem {
  @Prop({ required: true })
  icon: string;

  @Prop({ required: true })
  text: string;

  @Prop({ required: true })
  href: string;

  @Prop({ required: true })
  description: string;
}

@Schema()
class UserMenuLink {
  @Prop({ required: true })
  icon: string;

  @Prop({ required: true })
  text: string;

  @Prop({ required: true })
  href: string;
}

@Schema()
class UserMenu {
  @Prop({ type: UserProfile, required: true })
  profile: UserProfile;

  @Prop({ required: true, default: true })
  isLoggedIn: boolean;

  @Prop({ type: [UserMenuItem], required: true })
  menuItems: UserMenuItem[];

  @Prop({ type: [UserMenuLink], required: true })
  supportLinks: UserMenuLink[];

  @Prop({ type: [UserMenuLink], required: true })
  settingsLinks: UserMenuLink[];
}

@Schema()
class CallToAction {
  @Prop({ required: true })
  text: string;

  @Prop({ required: true })
  href: string;

  @Prop({ required: true, default: 'default' })
  variant: string;
}

@Schema()
class SeoConfig {
  @Prop({ required: true, default: 'Personal Wings - Learn. Grow. Succeed.' })
  title: string;

  @Prop({
    required: true,
    default: 'Empower your learning journey with Personal Wings',
  })
  description: string;

  @Prop({
    type: [String],
    default: ['education', 'online courses', 'learning platform'],
  })
  keywords: string[];

  @Prop({ default: '' })
  ogImage: string;

  @Prop({ default: '' })
  ogUrl: string;

  @Prop({ default: 'website' })
  ogType: string;

  @Prop({ default: '' })
  twitterCard: string;

  @Prop({ default: '' })
  twitterSite: string;

  @Prop({ default: '' })
  canonicalUrl: string;

  @Prop({ default: 'en_US' })
  locale: string;
}

@Schema({ timestamps: true })
export class HeaderNavigation {
  @Prop({ type: Logo, required: true })
  logo: Logo;

  @Prop({ type: Cart, required: true })
  cart: Cart;

  @Prop({ type: SearchConfig, required: true })
  search: SearchConfig;

  @Prop({ type: Navigation, required: true })
  navigation: Navigation;

  @Prop({ type: UserMenu, required: true })
  userMenu: UserMenu;

  @Prop({ type: CallToAction, required: true })
  cta: CallToAction;

  @Prop({ type: SeoConfig, required: true })
  seo: SeoConfig;

  @Prop({ required: true, default: true })
  isActive: boolean;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const HeaderNavigationSchema =
  SchemaFactory.createForClass(HeaderNavigation);

// Configure JSON transformation to properly serialize ObjectIds
HeaderNavigationSchema.set('toJSON', {
  transform: function (_doc: any, ret: any) {
    if (ret._id) ret._id = ret._id.toString();
    return ret;
  },
});

HeaderNavigationSchema.index({ isActive: 1 });
