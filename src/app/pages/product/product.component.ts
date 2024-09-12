import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { DbService } from '../../services/db.service';

@Component({
  selector: 'app-product',
  templateUrl: './product.component.html',
  styleUrl: './product.component.css'
})
export class ProductComponent {
  public product: any;
  public displayMode: string = "";
  public selectedTag: string = "";
  public displayedMedia: any[] = [];
  public selectedMedia: any[] = [];
  public availableTags: string[] = [];
  public productForm: FormGroup;
  
  private productId: string | undefined;
  private allMedia: any[] = [];
  private filteredMedia: any[] = [];  // List of media filtered by tag

  constructor(private route: ActivatedRoute, private fb: FormBuilder, private db: DbService) {
    this.productForm = this.fb.group({
      name: ['', Validators.required],  // Add the name field
      mediaList: [[]],
      tagFilter: [''] 
    });
  }

  ngOnInit(): void {
    this.productId = this.route.snapshot.paramMap.get('id') || '';
    this.fetchMedia();

    if (!this.productId) {
      this.setDisplayMode('all');
    }

    this.db.currentProduct.subscribe(product => {
      if (product) {
        this.product = product;
        this.productForm.patchValue({
          name: product.name,
        });
        this.productForm.controls['mediaList'].setValue(product.mediaList);
        this.preselectMedia();
      } else {
        this.setDisplayMode('all');
      }
    });

    this.productForm.get('tagFilter')?.valueChanges.subscribe(tag => {
      this.selectedTag = tag;
      this.filterMediaByTag();  // Filter the media when the tag changes
    });
  }

  drop(event: CdkDragDrop<any[]>) {
    const mediaList = this.productForm.controls['mediaList'].value;
    moveItemInArray(mediaList, event.previousIndex, event.currentIndex);
    this.productForm.controls['mediaList'].setValue(mediaList);
    this.saveProduct();
  }

  clearFilters() {
    this.productForm.controls['tagFilter'].setValue('');  // Clear tag filter
    this.filteredMedia = [...this.allMedia];  // Reset to show all media
    this.displayedMedia = [...this.allMedia];
    this.displayMode = 'all';  // Reset display mode to 'all'
    this.updatedisplayedMedia();
  }

  async fetchMedia() {
    this.allMedia = await this.db.getMedia(this.db.account.id);
    this.allMedia = this.allMedia;
    this.filteredMedia = this.allMedia;
    this.displayedMedia = this.allMedia;
    this.availableTags = this.db.mediaTags;

    // If product data is already loaded and media need to be preselected
    this.selectedMedia = this.productForm.controls['mediaList'].value ?? [];
    if (this.selectedMedia && this.selectedMedia.length > 0) {
      this.setDisplayMode('selected');
      this.preselectMedia();
      const selectedMedia = this.selectedMedia;
      if (selectedMedia && selectedMedia.length > 0) {
        this.allMedia.forEach(media => {
          // Check if this media object is already part of the product
          media.selected = selectedMedia.some((v: any) => v.id === media.id);
        });
      }
    } else {
      this.setDisplayMode('all');
    }
  }

  setDisplayMode(tab: string) {
    if (tab === 'all') {
      this.displayedMedia = this.allMedia;
    } else {
      this.displayedMedia = this.selectedMedia;
    }
  }

  // Filter media by the selected tag
  filterMediaByTag() {
    if (this.selectedTag && this.selectedTag !== '') {
      this.filteredMedia = this.allMedia.filter(media => media.tags.includes(this.selectedTag));
      this.displayedMedia = this.filteredMedia;
    } else {
      // If no tag is selected, show all media
      this.filteredMedia = this.allMedia;
    }
  }

  updatedisplayedMedia() {
    if (this.displayMode === 'selected') {
      this.displayedMedia = this.selectedMedia;
    } else {
      this.displayedMedia = this.filteredMedia;
    }
  }

  preselectMedia() {
    if (this.selectedMedia && this.selectedMedia.length > 0) {
      this.allMedia.forEach(media => {
        media.selected = this.isSelected(media);
      });
    }
  }

  onMediaSelect(event: any, media: any) {
    const selectedMedia = this.productForm.controls['mediaList'].value as any[];
  
    if (event.target.checked) {
      this.productForm.controls['mediaList'].setValue([...selectedMedia, media]);
    } else {
      this.productForm.controls['mediaList'].setValue(selectedMedia.filter(v => v.id !== media.id));
    }
  }

  onMediaSelected(media: any) {
    const index = this.selectedMedia.findIndex(v => v.id === media.id);

    if (index > -1) {
      this.selectedMedia.splice(index, 1);
    } else {
      this.selectedMedia.push(media);
    }
    this.productForm.controls['mediaList'].setValue(this.selectedMedia);
  }

  isSelected(media: any): boolean {
    if (this.selectedMedia && this.selectedMedia.length > 0) {
      return this.selectedMedia.some(v => v.id === media.id);
    }
    return false;
  }

  nameExists(name: string) {
    if (this.product.name === name) {
      return false;
    }
    const products = this.db.products;
    let exists = products.some((j: any) => j.name === name);
    return exists;
  }

  async saveProduct() {
    if (this.productForm.valid) {
      const name = this.productForm.value.name;
      const nameExists = this.nameExists(name);
      const mediaList = this.productForm.value.mediaList;
      const product: any = {
        accountId: this.db.account.id,
        name: name,
        mediaList: mediaList,
        mediaIds: mediaList.map((media: any) => media.id),
      };

      if (nameExists) {
        console.error('name exists');
      } else if (this.product.id) {
        this.db.updateProduct(this.product.id, product).then(() => {
        }).catch(error => {
          console.error('Error saving product:', error);
        });
      } else {
        this.db.createProduct(product).then(() => {
        }).catch(error => {
          console.error('Error saving product:', error);
        });
      }
    }
  }
}
