import {Parameter} from "./parameter.model";

export interface Feature{
   name : string,
   description : string,
   parameters : { [key: string]: Parameter}
}
