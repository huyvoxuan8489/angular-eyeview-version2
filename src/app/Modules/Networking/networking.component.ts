import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
    moduleId: module.id,
    templateUrl: 'networking.component.html',
    styleUrls: ['networking.component.scss']
})

export class NetworkingComponent implements OnInit {
    model: any = {};
    loading = false;
    returnUrl: string;

    constructor(
        private route: ActivatedRoute,
        private router: Router){ }
        // private authenticationService: AuthenticationService,
        // private alertService: AlertService) { }

    ngOnInit() {
        // reset login status
       // this.authenticationService.logout();

        // get return url from route parameters or default to '/'
        //this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
    }
}