import { Injectable } from '@angular/core';
import { AngularFireDatabase } from '@angular/fire/compat/database';
import { Observable } from 'rxjs';

export interface ITestItem {
    name: string,
    lat: number,
    lng: number
}

export interface GasStation {
    name: string,
    lat: number,
    lng: number,
    has_shop: boolean,
    has_carwash: boolean,
    diesel_price: number,
    gas_price: number
}

@Injectable()
export class FirebaseService {

    listFeed: Observable<any[]>;
    objFeed: Observable<any>;
    gasStationList: Observable<any[]>;

    constructor(public db: AngularFireDatabase) {

    }

    connectToDatabase() {
        this.listFeed = this.db.list('list').valueChanges();
        this.objFeed = this.db.object('obj').valueChanges();
        this.gasStationList = this.db.list('gasStations').valueChanges();
    }

    getChangeFeedList() {
        return this.listFeed;
    }

    getChangeFeedObj() {
        return this.objFeed;
    }

    getGasStationsList() {
            return this.gasStationList;
        }

    addGasStation(name: string, lat: number, lng: number, diesel_price: number, gas_price: number) {
            let item: GasStation = {
                name: name,
                lat: lat,
                lng: lng,
                diesel_price: diesel_price,
                gas_price : gas_price,
                has_shop: false,
                has_carwash: false
            };
            this.db.list('gasStations').push(item);
        }

    addPointItem(lat: number, lng: number) {
        let item: ITestItem = {
            name: "test",
            lat: lat,
            lng: lng
        };
        this.db.list('list').push(item);
    }

    syncPointItem(lat: number, lng: number) {
        let item: ITestItem = {
            name: "test",
            lat: lat,
            lng: lng
        };
        this.db.object('obj').set([item]);
    }
    removeGasStations() {
      this.db.list("gasStations").remove();
    }
}
