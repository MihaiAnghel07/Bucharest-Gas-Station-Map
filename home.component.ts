import { Component } from "@angular/core";


function login() {

  var userEmail = document.getElementById("email_field");
  var userPassword = document.getElementById("password_field");

  window.alert(userEmail + " " + userPassword);
}

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss']
})
export class HomeComponent {

    constructor() {

    }
}
