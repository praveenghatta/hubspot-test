import {Component, OnInit} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import * as _ from 'lodash';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'hubspot';

  constructor(private http: HttpClient) {}

  data = [];

  ngOnInit() {

    this.http.get<any>('https://candidate.hubteam.com/candidateTest/v3/problem/dataset?userKey=a9808be8e8a76d7938dec8d4fb7e').subscribe(data => {
      data = data.partners;

      //Segregate the array by each Country (Making it an array of objects)
      let count = 0, groupByCountries = [];
      groupByCountries = _.values(_.groupBy(_.map(data, (item, index: number) => {
          if (index == 0) return _.merge(item, {group: 0});
          ;
          if (data[index - 1].country == item.country)
            return _.merge(item, {group: count});
          return _.merge(item, {group: ++count});
        }
      ), 'group'));

      let allPostData: any = [], context = this;

      // Loop through each country data ...
      _.forEach(groupByCountries, function (singleCountry: any) {
        let countryName = singleCountry[0].country; //country is same for this aggregated list ...

        //Extract all dates from a single country's dates object to check for the date which has maximum of two consecutive occurrences..
        let singleCountryDates: any = [];
        _.forEach(singleCountry, function (single) {
          singleCountryDates.push(...new Set(single.availableDates.flat()))
        });

        //Rule out any dates which has count less than 2 as we intrested in only the ones which occur atleast 2 or more times.
        let allDateCounts: any = _.countBy(singleCountryDates);
        let dataValues = _.sortBy(Object.values(allDateCounts));
        let maxValues = _.values(_.groupBy(dataValues)).map(d => ({name: d[0], count: d.length}));
        maxValues = _.filter(maxValues, function(i){
          return i.count > 2;
        });
        let maxValue =  _.maxBy(maxValues, function(o) { return o.name; })?.name;

        //Based on the date which has maximum occurrence get all the actual DATE strings for further comparison ...
        let dates:any = [];
        _.map(allDateCounts, (value, key) => {
          if(value == maxValue){
            dates.push(key)
          }
          return value;
        });

        //Get all the partner's data in which we are interested ...
        let pp:any = [];
        let partnersAvailable = _.filter(singleCountry, (value:any, key:any) => {
          if(value.availableDates.indexOf(dates[0]) != -1 && value.availableDates.indexOf(dates[1]) != -1){
             pp.push(value);
          }
        });

        //Build the data object for each country - which we need to post to the API.
        let postSingleObj: any = {};
        postSingleObj.attendeeCount = pp.length;
        postSingleObj.attendees = _.map(pp, 'email');
        postSingleObj.name = countryName;
        postSingleObj.startDate = pp.length > 0 ? dates[0] : "null";
        allPostData.push(postSingleObj);
      });

      console.log(allPostData);

      //Post the Data to the API ...
      this.http.post<any>('https://candidate.hubteam.com/candidateTest/v3/problem/result?userKey=a9808be8e8a76d7938dec8d4fb7e',
        {"countries": allPostData}).subscribe(data => {
         console.log(data);
      });

    });
  }

}
