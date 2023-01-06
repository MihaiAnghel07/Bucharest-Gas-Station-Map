/*
  Copyright 2019 Esri
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  OnDestroy
} from "@angular/core";
import { dir } from "console";
import { setDefaultOptions, loadModules } from 'esri-loader';
import { Subscription } from "rxjs";
import { FirebaseService, ITestItem, GasStation } from "src/app/services/database/firebase";
import { FirebaseMockService } from "src/app/services/database/firebase-mock";
import esri = __esri; // Esri TypeScript Types
import { getAuth, signInWithCustomToken } from "firebase/auth";

@Component({
  selector: "app-esri-map",
  templateUrl: "./esri-map.component.html",
  styleUrls: ["./esri-map.component.scss"]
})
export class EsriMapComponent implements OnInit, OnDestroy {
  // The <div> where we will place the map
  @ViewChild("mapViewNode", { static: true }) private mapViewEl: ElementRef;

  // register Dojo AMD dependencies
  _Map;
  _MapView;
  _FeatureLayer;
  _Graphic;
  _GraphicsLayer;
  _Route;
  _RouteParameters;
  _FeatureSet;
  _Point;
  _locator;
  _Track;
  _Locator;

  // Instances
  map: esri.Map;
  view: esri.MapView;
  pointGraphic: esri.Graphic;
  graphicsLayer: esri.GraphicsLayer;

  // Attributes
  zoom = 10;
  //Coordonate Bucuresti
  center: Array<number> = [26.156200, 44.463637];
  basemap = "arcgis-topographic";
  loaded = false;
  pointCoords: number[] = [26.156200, 44.463637];
  dir: number = 0;
  count: number = 0;
  timeoutHandler = null;

  // firebase sync
  isConnected: boolean = false;
  subscriptionList: Subscription;
  subscriptionObj: Subscription;
  // add gas stations to local memory
  subscriptionGasStationList: Subscription;

  constructor(
    private fbs: FirebaseService
    //private fbs: FirebaseMockService
  ) { }

  async initializeMap() {
    try {
      // configure esri-loader to use version x from the ArcGIS CDN
      // setDefaultOptions({ version: '3.3.0', css: true });
      setDefaultOptions({ css: true });

      // Load the modules for the ArcGIS API for JavaScript
      const [esriConfig, Map, MapView, FeatureLayer, Graphic, Point, GraphicsLayer, route, RouteParameters, FeatureSet, Locate, Track, Locator] = await loadModules([
        "esri/config",
        "esri/Map",
        "esri/views/MapView",
        "esri/layers/FeatureLayer",
        "esri/Graphic",
        "esri/geometry/Point",
        "esri/layers/GraphicsLayer",
        "esri/rest/route",
        "esri/rest/support/RouteParameters",
        "esri/rest/support/FeatureSet",
        "esri/widgets/Locate",
        "esri/widgets/Track",
        "esri/rest/locator"
      ]);

      esriConfig.apiKey = "AAPKfc69bd3440b74e34b234a9ecd0bef01111QfRPopiHBLQghd945auH5VGIW_0aaeyvMFsHz9H3CivnRAaODpHQere5fdEPsv";

      this._Map = Map;
      this._MapView = MapView;
      this._FeatureLayer = FeatureLayer;
      this._Graphic = Graphic;
      this._GraphicsLayer = GraphicsLayer;
      this._Route = route;
      this._RouteParameters = RouteParameters;
      this._FeatureSet = FeatureSet;
      this._Point = Point;
      this._Track = Track;
      this._Locator = Locator;

      // Configure the Map
      const mapProperties = {
        basemap: this.basemap
      };

      this.map = new Map(mapProperties);

      this.addFeatureLayers();
      this.addGraphicLayers();

      //this.addPoint(this.pointCoords[1], this.pointCoords[0], true);

      // Initialize the MapView
      const mapViewProperties = {
        container: this.mapViewEl.nativeElement,
        center: this.center,
        zoom: this.zoom,
        map: this.map
      };

      this.view = new MapView(mapViewProperties);

      // Fires `pointer-move` event when user clicks on "Shift"
      // key and moves the pointer on the view.
      this.view.on('pointer-move', ["Shift"], (event) => {
        let point = this.view.toMap({ x: event.x, y: event.y });
        console.log("map moved: ", point.longitude, point.latitude);
      });




      await this.view.when(); // wait for map to load
      console.log("ArcGIS map loaded");
      console.log("Map center: " + this.view.center.latitude + ", " + this.view.center.longitude);

      this.addTracking();
      this.addRouter();
      //this.addGasStationItem("ala jmk", 100.23, 111.22, 222);
      //this.addFindPlaces(this._Locator, this.view, this._Graphic, this.fbs, this);
      this.GasStationSelector(this._Locator, this.view, this._Graphic, this.fbs, this);


      return this.view;
    } catch (error) {
      console.log("EsriLoader: ", error);
    }
  }

  // Login - with firebase

  // ------------------------------------------------------------

  addGraphicLayers() {
    this.graphicsLayer = new this._GraphicsLayer();
    this.map.add(this.graphicsLayer);
  }

  addFeatureLayers() {
    // Trailheads feature layer (points)
    var trailheadsLayer: __esri.FeatureLayer = new this._FeatureLayer({
      url:
        "https://services3.arcgis.com/GVgbJbqm8hXASVYi/arcgis/rest/services/Trailheads/FeatureServer/0"
    });

    this.map.add(trailheadsLayer);

    // Trails feature layer (lines)
    var trailsLayer: __esri.FeatureLayer = new this._FeatureLayer({
      url:
        "https://services3.arcgis.com/GVgbJbqm8hXASVYi/arcgis/rest/services/Trails/FeatureServer/0"
    });

    this.map.add(trailsLayer, 0);

    // Parks and open spaces (polygons)
    var parksLayer: __esri.FeatureLayer = new this._FeatureLayer({
      url:
        "https://services3.arcgis.com/GVgbJbqm8hXASVYi/arcgis/rest/services/Parks_and_Open_Space/FeatureServer/0"
    });

    this.map.add(parksLayer, 0);

    console.log("feature layers added");
  }

  addTracking() {
    // tracking
    const track = new this._Track({
      view: this.view,
      graphic: new this._Graphic({
        symbol: {
          type: "simple-marker",
          size: "12px",
          color: "green",
          outline: {
            color: "#efefef",
            width: "1.5px"
          }
        }
      }),
      useHeadingEnabled: false
    });
    this.view.ui.add(track, "top-left");
  }

  addRouter() {
    const routeUrl = "https://route-api.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World";

    this.view.on("click", (event) => {
      console.log("point clicked: ", event.mapPoint.latitude, event.mapPoint.longitude);
      if (this.view.graphics.length === 0) {
        addGraphic("origin", event.mapPoint);
      } else if (this.view.graphics.length === 1) {
        addGraphic("destination", event.mapPoint);
        getRoute(); // Call the route service
      } else {
        this.view.graphics.removeAll();
        addGraphic("origin", event.mapPoint);
      }
    });

    var addGraphic = (type: any, point: any) => {
      const graphic = new this._Graphic({
        symbol: {
          type: "simple-marker",
          color: (type === "origin") ? "white" : "black",
          size: "8px"
        } as any,
        geometry: point
      });
      this.view.graphics.add(graphic);
    }

    var getRoute = () => {
      const routeParams = new this._RouteParameters({
        stops: new this._FeatureSet({
          features: this.view.graphics.toArray()
        }),
        returnDirections: true
      });

      this._Route.solve(routeUrl, routeParams).then((data: any) => {
        for (let result of data.routeResults) {
          result.route.symbol = {
            type: "simple-line",
            color: [5, 150, 255],
            width: 3
          };
          this.view.graphics.add(result.route);
        }

        // Display directions
        if (data.routeResults.length > 0) {
          const directions: any = document.createElement("ol");
          directions.classList = "esri-widget esri-widget--panel esri-directions__scroller";
          directions.style.marginTop = "0";
          directions.style.padding = "15px 15px 15px 30px";
          const features = data.routeResults[0].directions.features;


          let sum = 0;
          // Show each direction
          features.forEach((result: any, i: any) => {
            sum += parseFloat(result.attributes.length);
            const direction = document.createElement("li");
            direction.innerHTML = result.attributes.text + " (" + result.attributes.length * 1.609344 + " km)";
            directions.appendChild(direction);
            if (features.length - 1 == i) {
              const direction2 = document.createElement("li");
              direction2.innerHTML = "Total distance: " + sum * 1.609344 + " km";
              directions.appendChild(direction2);
            }
          });


          sum = sum * 1.609344;
          console.log('dist (km) = ', sum);

          this.view.ui.empty("top-right");
          this.view.ui.add(directions, "top-right");

        }

      }).catch((error: any) => {
        console.log(error);
      });
    }
  }


  /*  Function to draw dropdown in order to select ce ai nevoie */

    GasStationSelector(locator, view, Graphic, fbs, current_instance) {

      const places = ["Choose a place type...", "Gas stations", "Stations with selfwash", "Stations with shops",
                      "Stations with selfwash and shop"];

      const select = document.createElement("select");
      select.setAttribute("class", "esri-widget esri-select");
      select.setAttribute("style", "width: 175px; font-family: 'Avenir Next W00'; font-size: 1em");

      places.forEach(function(p){
        const option = document.createElement("option");
        option.value = p;
        option.innerHTML = p;
        select.appendChild(option);
      });

      view.ui.add(select, "top-left");


      function determine_category(category) {
        current_instance.graphicsLayer.removeAll();

        if (category.localeCompare("Gas stations") == 0) {
            console.log("Prima ramura a if-ului full gas stations")
            // Added gas station list to local memory when connecting to Firebase
            current_instance.subscriptionGasStationList = fbs.getGasStationsList().subscribe((items: GasStation[]) => {
                console.log("New gas station point added from: ", items);
                current_instance.graphicsLayer.removeAll();

                for (let item of items) {
                  current_instance.addGasStation(item.name, item.lat, item.lng, item.diesel_price, item.gas_price,
                  false, item.has_shop, item.has_carwash);
                }
              });
        }
        if (category.localeCompare("Stations with selfwash") == 0) {
            console.log("A doua  ramura a if-ului self gas stations")

            current_instance.subscriptionGasStationList = fbs.getGasStationsList().subscribe((items: GasStation[]) => {
                console.log("New gas station point added from: ", items);
                current_instance.graphicsLayer.removeAll();

                for (let item of items) {
                  if (item.has_carwash) {
                    current_instance.addGasStation(item.name, item.lat, item.lng, item.diesel_price, item.gas_price,
                    false, item.has_shop, item.has_carwash);
                  }
                }
              });
        }
        if (category.localeCompare("Stations with shops") == 0) {
            console.log("A treia ramura a if-ului shops gas stations")
            current_instance.subscriptionGasStationList = fbs.getGasStationsList().subscribe((items: GasStation[]) => {
              console.log("New gas station point added from: ", items);
              current_instance.graphicsLayer.removeAll();

              for (let item of items) {
                if (item.has_shop) {
                  current_instance.addGasStation(item.name, item.lat, item.lng, item.diesel_price, item.gas_price,
                  false, item.has_shop, item.has_carwash);
                }
              }
            });
        }
        if (category.localeCompare("Stations with selfwash and shop") == 0) {
            console.log("Ultima ramura a if-ului shops gas stations")
            current_instance.subscriptionGasStationList = fbs.getGasStationsList().subscribe((items: GasStation[]) => {
              console.log("New gas station point added from: ", items);
              current_instance.graphicsLayer.removeAll();

              for (let item of items) {
                if (item.has_carwash && item.has_shop) {
                  current_instance.addGasStation(item.name, item.lat, item.lng, item.diesel_price, item.gas_price,
                  false, item.has_shop, item.has_carwash);
                }
              }
            });
        }
      }
// ------------------------------------------------------------------------------------------------------------
      // Listen for category changes and find places
      select.addEventListener('change', function (event) {
      determine_category((event.target as HTMLTextAreaElement).value);
      });

        }

 // Search for places in center of map
      //view.watch("stationary", function(val) {
       // if (val) {
       //   findPlaces(select.value, this.center, locator, view, Graphic);
        //}
        //});

  addFindPlaces(locator, view, Graphic, fbs, current_instance) {

    const places = ["Choose a place type...", "Parks and Outdoors", "Coffee shop", "Gas station", "Food", "Hotel"];

    const select = document.createElement("select");
    select.setAttribute("class", "esri-widget esri-select");
    select.setAttribute("style", "width: 175px; font-family: 'Avenir Next W00'; font-size: 1em");

    places.forEach(function(p){
      const option = document.createElement("option");
      option.value = p;
      option.innerHTML = p;
      select.appendChild(option);
    });

    view.ui.add(select, "top-left");

    const locatorUrl = "http://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer";

    // Find places and add them to the map
    function findPlaces(category, pt, locator, view, Graphic) {
      locator.addressToLocations(locatorUrl, {
        location: pt,
        categories: [category],
        maxLocations: 10,
        outFields: ["Place_addr", "PlaceName", "X", "Y"]
      })

      .then(function(results) {
        view.popup.close();
        view.graphics.removeAll();

        console.log("got new items from list: ", results[0].location.latitude);

        // Adding gas station to database
        results.forEach(function(result){
          let diesel_price = Math.random();
          diesel_price += 7;

          let gas_price = Math.random();
          gas_price += 6;
          current_instance.addGasStationItem(result.attributes.PlaceName, result.location.latitude,
                                             result.location.longitude, diesel_price, gas_price);

          view.graphics.add(
            new Graphic({
              attributes: result.attributes,  // Data attributes returned
              geometry: result.location, // Point returned
              symbol: {
              type: "simple-marker",
              color: "#000000",
              size: "12px",
              outline: {
                color: "#ffffff",
                width: "2px"
              }
              },

              popupTemplate: {
                title: "{PlaceName}", // Data attribute names
                content: "{Place_addr}, {X}, {Y}, {pret}",
              }
          }));
        });

      });

    }

    // Search for places in center of map
    view.watch("stationary", function(val) {
      if (val) {
        findPlaces(select.value, this.center, locator, view, Graphic);
      }
      });

    // Listen for category changes and find places
    select.addEventListener('change', function (event) {
      findPlaces((event.target as HTMLTextAreaElement).value, [26.156200, 44.463637], locator, view, Graphic);
    });

  }

  // Here we add the gast station point to the map
  addGasStation(name: string, lat: number, lng: number, diesel_price: number, gas_price: number, register: boolean,
                has_shop: boolean, has_carwash: boolean) {
    const point = { //Create a point
        type: "point",
        longitude: lng,
        latitude: lat
      };
      const simpleMarkerSymbol = {
        type: "simple-marker",
        color: [255, 0, 0],  // Orange
        outline: {
          color: [255, 255, 255], // White
          width: 1
        }
      };

    var out_string = "<p>Benzinaria " + name + " are urmatoarele preturi: </p>" +
                     "<ul><li>Motorina: " + diesel_price.toFixed(2) + "</li>" +
                     "<li>Benzina: " +  gas_price.toFixed(2) + "</li>";

    if (has_shop && has_carwash) {
        out_string = out_string.concat("<li>Benzinaria are magazin propriu si spalatorie.</li><ul>");
    } else if (has_shop) {
        out_string = out_string.concat("<li>Benzinaria are magazin propriu.</li><ul>");
    } else if (has_carwash) {
        out_string = out_string.concat("<li>Benzinaria are spalatorie.</li><ul>");
    } else {
        out_string = out_string.concat("<ul>");
    }
    var pointGraphic: esri.Graphic = new this._Graphic({
           geometry: point,
           symbol: simpleMarkerSymbol,


           popupTemplate: {
             title: name, // Data attribute names
             content: out_string,

           }
         });

    this.graphicsLayer.add(pointGraphic);
        if (register) {
          this.pointGraphic = pointGraphic;
        }
  }

  addPoint(lat: number, lng: number, register: boolean) {
    const point = { //Create a point
      type: "point",
      longitude: lng,
      latitude: lat
    };
    const simpleMarkerSymbol = {
      type: "simple-marker",
      color: [226, 119, 40],  // Orange
      outline: {
        color: [255, 255, 255], // White
        width: 1
      }
    };
    let pointGraphic: esri.Graphic = new this._Graphic({
      geometry: point,
      symbol: simpleMarkerSymbol
    });

    this.graphicsLayer.add(pointGraphic);
    if (register) {
      this.pointGraphic = pointGraphic;
    }
  }

  removePoint() {
    if (this.pointGraphic != null) {
      this.graphicsLayer.remove(this.pointGraphic);
    }
  }

  runTimer() {
    this.timeoutHandler = setTimeout(() => {
      // code to execute continuously until the view is closed
      // ...
      this.animatePointDemo();
      this.runTimer();
    }, 200);
  }

  animatePointDemo() {
    this.removePoint();
    switch (this.dir) {
      case 0:
        this.pointCoords[1] += 0.01;
        break;
      case 1:
        this.pointCoords[0] += 0.02;
        break;
      case 2:
        this.pointCoords[1] -= 0.01;
        break;
      case 3:
        this.pointCoords[0] -= 0.02;
        break;
    }

    this.count += 1;
    if (this.count >= 10) {
      this.count = 0;
      this.dir += 1;
      if (this.dir > 3) {
        this.dir = 0;
      }
    }
    this.syncPointItem(this.pointCoords[1], this.pointCoords[0]);
    this.addPoint(this.pointCoords[1], this.pointCoords[0], true);
  }

  stopTimer() {
    if (this.timeoutHandler != null) {
      clearTimeout(this.timeoutHandler);
      this.timeoutHandler = null;
    }
  }

  connectFirebase() {

    if (this.isConnected) {
      return;
    }

    this.isConnected = true;
    this.fbs.connectToDatabase();

    this.subscriptionList = this.fbs.getChangeFeedList().subscribe((items: ITestItem[]) => {
      console.log("got new items from list: ", items);
      this.graphicsLayer.removeAll();
      for (let item of items) {
        this.addPoint(item.lat, item.lng, false);
      }
    });

    this.subscriptionObj = this.fbs.getChangeFeedObj().subscribe((stat: ITestItem[]) => {
      console.log("item updated from object: ", stat);

    });


    //console.log("Lista cu gas stations uri are dimensiuena aia blana: ", Object.keys(this.fbs.getGasStationsList()).length);
    // TODO : check if the asked list is the same from firebase
  }

  addPointItem() {
    console.log("Map center: " + this.view.center.latitude + ", " + this.view.center.longitude);
    this.fbs.addPointItem(this.view.center.latitude, this.view.center.longitude);
  }

  addGasStationItem(name, lat, lng, diesel_price, gas_price) {
    console.log("Benzinarie adaugata: " + lat + ", " + lng);
        this.fbs.addGasStation(name, lat, lng, diesel_price, gas_price);
  }


  syncPointItem(a, b) {
    console.log("SYNC: " + this.view.center.latitude + ", " + this.view.center.longitude);
    this.fbs.syncPointItem(a, b);
  }

  disconnectFirebase() {
    if (this.subscriptionList != null) {
      this.subscriptionList.unsubscribe();
    }
    if (this.subscriptionObj != null) {
      this.subscriptionObj.unsubscribe();
    }

    if (this.subscriptionGasStationList != null) {
          this.subscriptionGasStationList.unsubscribe();
        }
  }

  ngOnInit() {
    // Initialize MapView and return an instance of MapView
    console.log("initializing map");
    this.initializeMap().then(() => {
      // The map has been initialized
      console.log("mapView ready: ", this.view.ready);
      this.loaded = this.view.ready;
      //this.runTimer();
    });
  }

  ngOnDestroy() {
    if (this.view) {
      // destroy the map view
      this.view.container = null;
    }
    this.stopTimer();
    this.disconnectFirebase();
  }
}
