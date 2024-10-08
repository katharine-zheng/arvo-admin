import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ProductsComponent } from './pages/products/products.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatTableModule } from '@angular/material/table'; // Import the MatTableModule
import { MatFormFieldModule } from '@angular/material/form-field'; // Optional for form fields in the table
import { MatInputModule } from '@angular/material/input'; // Optional for input in the table
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { ProductFormComponent } from './modals/product-form/product-form.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MediaComponent } from './pages/media/media.component';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getAnalytics, provideAnalytics, ScreenTrackingService, UserTrackingService } from '@angular/fire/analytics';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getFunctions, provideFunctions } from '@angular/fire/functions';
import { getStorage, provideStorage } from '@angular/fire/storage';
import { environment } from '../environments/environment';
import { DeleteDialogComponent } from './modals/delete-dialog/delete-dialog.component';
import { JourneyComponent } from './pages/journey/journey.component';
import { MediaUploadComponent } from './components/media-upload/media-upload.component';
import { AuthComponent } from './pages/auth/auth.component';
import { TagFormComponent } from './modals/tag-form/tag-form.component';
import { JourneysComponent } from './pages/journeys/journeys.component';
import { QRCodeComponent } from './modals/qrcode/qrcode.component';
import { ProductComponent } from './pages/product/product.component';
import { ShopifyComponent } from './pages/shopify/shopify.component';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { DatePipe } from '@angular/common';
import { ChartComponent } from './components/chart/chart.component';
import { ContentBlockComponent } from './components/content-block/content-block.component';
import { PageEditorComponent } from './components/page-editor/page-editor.component';
import { MediaLibraryComponent } from './components/media-library/media-library.component';
import { ThemeEditorComponent } from './components/theme-editor/theme-editor.component';
import { ContentBlockEditorComponent } from './components/content-block-editor/content-block-editor.component';

@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
    ProductsComponent,
    SettingsComponent,
    ProductFormComponent,
    MediaComponent,
    DeleteDialogComponent,
    JourneyComponent,
    MediaUploadComponent,
    AuthComponent,
    TagFormComponent,
    JourneysComponent,
    QRCodeComponent,
    ProductComponent,
    ShopifyComponent,
    ChartComponent,
    ContentBlockComponent,
    PageEditorComponent,
    MediaLibraryComponent,
    ThemeEditorComponent,
    ContentBlockEditorComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    DragDropModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
    // NgChartsModule,
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideAnalytics(() => getAnalytics()),
    provideFirestore(() => getFirestore()),
    provideFunctions(() => getFunctions()),
    provideStorage(() => getStorage()),
  ],
  providers: [
    DatePipe,
    provideAnimationsAsync('noop'),
    ScreenTrackingService,
    UserTrackingService,
    provideAnimationsAsync(),
    provideCharts(withDefaultRegisterables())
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
