export class Product {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;

  constructor(data: any) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.imageUrl = data.imageUrl;
  }
}
