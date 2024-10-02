import { Injectable } from "@angular/core";
import { Functions, httpsCallable } from "@angular/fire/functions";

@Injectable({
  providedIn: "root"
})
export class AnalyticsService {

  public data: any = {};

  // TODO
  // private streamId = "9667212045";
  private streamId = "9667279326";
  
  constructor(private functions: Functions) {}

  async getGAReport(key: string, params: any) {
    if (this.data[key]) {
      return this.data[key];
    }
    params['dimensionFilter'] = {
      filter: {
        fieldName: "streamId",
        stringFilter: {matchType: "EXACT", value: this.streamId},
      },
    }
    const callable = httpsCallable(this.functions, "getReport");
    let data;
    try {
      await callable(params).then((response: any) => {
        data = response.data;
        this.data[key] = data;
      }).catch((error) => {
        console.error(error);
        // this.handleError(error);
      });
    } catch (error) {
      console.error("Error fetching GA data:", error);
    }
    return data;
  }
}
