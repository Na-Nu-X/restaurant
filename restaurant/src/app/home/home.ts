import { Component } from "@angular/core";
import { Banner } from '../banner/banner'; 
import { SearchBar } from '../search-bar/search-bar'; 
import { Catalog } from '../catalog/catalog';

@Component({
  selector: 'app-home',
  imports: [
    Banner,
    SearchBar,
    Catalog
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {}
