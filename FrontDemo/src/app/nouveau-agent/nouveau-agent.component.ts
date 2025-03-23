import { Component ,OnInit } from '@angular/core';
import { MARKETS_LIST } from "../shared/data/const-market-list";
import { FormBuilder, FormGroup , Validator, Validators} from '@angular/forms';
import {FeatureInDto} from "../models/request/feature-in-dto";
import {InfoService} from "../services/agent.service";
import {Feature} from "../models/API/feature";

@Component({
  selector: '',
  templateUrl: './nouveau-agent.component.html',
})
export class NouveauAgentComponent implements OnInit{




    myForm!: FormGroup;
    marketLists = MARKETS_LIST;
    //featureLists !:Feature[];
    //test
    feature1 : Feature= { name : "feat1 " , parameters:["param1 de feat1" , "param2 de feat1"]}
    feature2 : Feature= { name : "feat2 " , parameters:["param1 de feat2" , "param2 de feat2"]}
    featureLists :Feature[]=[this.feature1,this.feature2];

  //
    constructor(private fb: FormBuilder , private infoService :InfoService ) {}


    ngOnInit() {
      /*
      this.infoService.getFeatures().subscribe(
        (res) => this.featureLists=res.features
      )
      */
      this.myForm = this.fb.group({
        username: ["",[Validators.required, Validators.minLength(5)]],
        agentName: ["",[Validators.required, Validators.minLength(5)]],
        email: [""],
        targetMarket: [""],
        inputStartTime: [""],
        inputEndTime: [""],
        outputStartTime: [""],
        outputEndTime: [""],
        features : this.fb.group({})
      })
    }
    addOuRemoveFeature(featureName: string) {
      const features = this.myForm.get('features') as FormGroup;
      
      // Chercher si un groupe avec ce nom existe déjà
      const existingFeature = features.get(featureName);
      
      if (existingFeature !== null) {
        // Si le groupe existe déjà, le supprimer
        features.removeControl(featureName);
      } else {
        // Sinon, ajouter un nouveau groupe
        features.addControl(featureName,this.fb.group({}));
        const feature= this.myForm.get('features')?.get(featureName) as FormGroup
        this.addParamFeature(feature, featureName)
      }
    }
    addParamFeature(formGroupCible: FormGroup , featureName : string){
      const feature : Feature | undefined = this.featureLists.find(feature => feature.name.trim() === featureName.trim());
      if (!feature) {
        console.error(`Feature with name ${featureName} not found`);
        return;
      }
      if(formGroupCible === null)
        console.log("error dans addPAramFeature , ne peut pas produire")
      for(const paramName of feature.parameters )
         formGroupCible.addControl(paramName,this.fb.control(""))
    }
    


    onSubmit(){
      console.log(this.myForm.value)
    }







}
