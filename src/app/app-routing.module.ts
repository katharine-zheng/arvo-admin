import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { MediaComponent } from './pages/media/media.component';
import { ProductsComponent } from './pages/products/products.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { JourneyComponent } from './pages/journey/journey.component';
import { authGuard } from './guards/auth.guard';
import { AuthComponent } from './pages/auth/auth.component';
import { JourneysComponent } from './pages/journeys/journeys.component';
import { ProductComponent } from './pages/product/product.component';
import { ShopifyComponent } from './pages/shopify/shopify.component';

const routes: Routes = [
  { path: 'auth', component: AuthComponent },
  { path: 'shopify', component: ShopifyComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'media', component: MediaComponent, canActivate: [authGuard] },
  { path: 'media/product/:id', component: MediaComponent, canActivate: [authGuard] },
  { path: 'journeys', component: JourneysComponent, canActivate: [authGuard] },
  { path: 'product', component: ProductComponent, canActivate: [authGuard] },
  { path: 'product/:id', component: ProductComponent, canActivate: [authGuard] },
  { path: 'products', component: ProductsComponent, canActivate: [authGuard] },
  { path: 'products/:pId/journey', component: JourneyComponent, canActivate: [authGuard]},
  { path: 'journey', component: JourneyComponent, canActivate: [authGuard] },
  { path: 'journey/:id', component: JourneyComponent, canActivate: [authGuard]},
  { path: 'settings', component: SettingsComponent, canActivate: [authGuard] },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: '/auth', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
