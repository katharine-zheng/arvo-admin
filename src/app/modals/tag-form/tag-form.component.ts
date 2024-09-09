import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DbService } from '../../services/db.service';

@Component({
  selector: 'app-tag-form',
  templateUrl: './tag-form.component.html',
  styleUrl: './tag-form.component.css'
})
export class TagFormComponent implements OnInit {
  tags: string[] = [];
  newTag: string = '';

  constructor(
    private db: DbService,
    public dialogRef: MatDialogRef<TagFormComponent>,
  ) {}

  ngOnInit(): void {
    this.tags = this.db.videoTags;
  }

  async deleteTag(tag: string) {
    try {
      await this.db.deleteTag(tag);
      this.tags = this.db.videoTags;
    } catch (error) {

    }
  }

  close(): void {
    this.dialogRef.close();
  }

  createTag(): void {
    if (this.newTag.trim()) {
      this.dialogRef.close(this.newTag); // Pass the new tag back
    }
  }
}
