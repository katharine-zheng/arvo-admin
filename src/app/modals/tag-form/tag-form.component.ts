import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DbService } from '../../services/db.service';

@Component({
  selector: 'app-tag-form',
  templateUrl: './tag-form.component.html',
  styleUrl: './tag-form.component.css'
})
export class TagFormComponent implements OnInit {
  public tags: string[] = [];
  public newTag: string = "";

  constructor(
    private db: DbService,
    public dialogRef: MatDialogRef<TagFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit(): void {
    this.tags = (this.data.tags && this.data.tags.length > 0) ? this.data.tags : this.db.mediaTags;
  }

  addTag(): void {
    if (!this.tags.includes(this.newTag)) {
      this.tags.push(this.newTag);
    }
    this.newTag = "";
  }

  removeTag(tag: string) {
    this.tags = this.tags.filter((t: string) => t !== tag);
  }

  update() {
    this.dialogRef.close(this.tags);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
