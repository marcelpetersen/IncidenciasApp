import { Component ,ElementRef,ViewChild} from '@angular/core';
import { NavController ,NavParams,ActionSheetController,ToastController} from 'ionic-angular';
import { AngularFireDatabase, FirebaseListObservable } from 'angularfire2/database';
import {Admin} from '../admin/admin';
import {SubirFoto} from '../../providers/subir-foto';
import { CogerUbicacion } from '../../providers/coger-ubicacion';
import { Geolocation } from '@ionic-native/geolocation';
import { Camera } from '@ionic-native/camera';
import {VistaUbicacion} from '../vista-ubicacion/vista-ubicacion';
import {enableProdMode} from '@angular/core';

declare var cordova: any;
declare var google;
enableProdMode();

@Component({
  selector: 'page-dialogo-incidencia',
  templateUrl: 'dialogo-incidencia.html',
})
export class DialogoIncidencia {
  fechalimite:any='';
  incidenciaArray=[];
  tipos=[];
  valor:any;
  incidencia=[];
  incidenciafinal={};
  encargados=[];
  userKey:any;
  ubicacion:{}
  encargadoKey:any;
  base64img:string;
  photos:any[]=[];
  latLng:any;
  fechaToday:any;
  day:any;
  month:any;
  admin:any;
  adminKey:any;
  adminDefault:any;
  adminDefaultKey:any;
  constructor(public navCtrl: NavController,
              public af:AngularFireDatabase,
              public navParams: NavParams,
              public actionSheetCtrl:ActionSheetController,
              public sFoto:SubirFoto,
              private camera: Camera,
              private geolocation:Geolocation,
              public cogerUbi:CogerUbicacion,
              public toast:ToastController
  ) {
    this.tipos=["Basura","Alcantarillado","Farolas"];
    this.incidenciaArray=[];
    this.base64img="../../assets/images/ayuntamiento.jpg"
    //this.getEncargadosPermiteRecibir();
    console.log(this.encargados);
    this.cogerFechaHoy();

    this.geolocation.getCurrentPosition().then((position) => {//AL DARLE A AÑADIR INCIDENCIA RECOGE LA UBICACION PARA LA INCIDENCIA
      this.latLng ={lat:position.coords.latitude, long:position.coords.longitude};
      this.cogerUbi.setUbicacion(this.latLng);
      this.ubicacion=this.cogerUbi.getUbicacion();
      console.log(this.ubicacion);
    }, (err) => {
      console.log(err);
    });

     }

  ionViewDidLoad() {

    console.log('ionViewDidLoad DialogoIncidencia');
  }
  ionViewWillEnter(){
    this.getEncargadosPermiteRecibir();
    this.getAdminDefault();
    this.geolocation.getCurrentPosition().then((position) => {//AL DARLE A AÑADIR INCIDENCIA RECOGE LA UBICACION PARA LA INCIDENCIA
      this.latLng ={lat:position.coords.latitude, long:position.coords.longitude};
      this.cogerUbi.setUbicacion(this.latLng);
      this.ubicacion=this.cogerUbi.getUbicacion();
      console.log(this.ubicacion);
    }, (err) => {
      console.log(err);
    });
 }
  cogerFechaHoy(){
    if((new Date().getDate())<10){
      this.day='0'+(new Date().getDate());
    }else{
      this.day=(new Date().getDate());
    }
    if((new Date().getMonth()+1)<10){
      this.month='0'+(new Date().getMonth()+1)
    }else{
      this.month=(new Date().getMonth()+1)
    }
    this.fechaToday=new Date().getFullYear()+'-'+this.month+'-'+this.day;

  }
  //AÑADE LA INCIDENCIA CREADA A LA RAMA INCIDENCIAS Y A CADA USUARIO DENTRO DE SU RAMA INCIDENCIASCREADAS
  addIncidencia(){

    this.incidenciaArray.push(this.incidencia);//GUARDAMOS LOS DATOS DEL FORM EN UN ARRAY
    this.incidenciaArray.forEach(data=>{

      console.log(data);
      console.log(this.cogerUbi.getUbicacion());
      this.incidenciafinal={//CREAMOS UNA INCIDENCIA INICIAL Y APARTE RECOGEMOS DATOS DEL FORM DEL HTML
        fecha: new Date().getDate() + '/'+(new Date().getMonth()+1)+'/'+new Date().getFullYear(),
        hora:new Date().getHours()+ ':'+ new Date().getMinutes(),
        creadaPor:localStorage.getItem("user_uid"),
        ubicacion:this.cogerUbi.getUbicacion(),
        estado:"Pendiente",
        resueltaPor:"",
        descripcion:data.descripcion,
        encargado:data.encargado !=undefined ? data.encargado :this.adminDefaultKey,
        fechalimite:data.fechalimite != undefined ? data.fechalimite:"",
        tipo:data.tipo
      };
    })
    this.af.list('/incidencias').push(this.incidenciafinal).then((success)=>{//AÑADE LA INCIDENCIA A LA RAMA INCIDENCIA
      this.af.object('/incidencias/'+success.key+'/foto1').set(this.base64img);//AÑADE LAS FOTOS A LA RAMA FOTOS DE LA INCIDENCIA
      this.incidenciaArray.forEach(data=>{
        console.log(data);
        this.af.object('/users/'+localStorage.getItem("user_uid")+'/incidenciasCreadas/'+success.key).set(data.descripcion);
        this.addIncidenciaAsignadaUsuario(data.encargado,success.key,data.descripcion);
        console.log(data.encargado,success.key,data.descripcion)
      })
      this.writeToast("Se ha creado una incidencia")
    this.navCtrl.pop();
  }).catch(error=>{
    console.log(error);
    });

  }
  //AÑADIR INCIDENCIA AL USUARIO ASIGNADO
  addIncidenciaAsignadaUsuario(userKey,key,descripcion){
   // this.cogerKeyUsuarioPorNombre(userName);
    if(userKey==undefined){
      this.af.object('/users/'+this.adminDefaultKey+'/incidenciasAsignadas/'+key).set(descripcion);
    }else{
      this.af.object('/users/'+userKey+'/incidenciasAsignadas/'+key).set(descripcion);

    }
  }
  //RECOGE ENCARGADOS A LOS QUE SE LE PERMITE ASIGNAR TAREA
  getEncargadosPermiteRecibir(){
    this.af.list('/users').forEach(data=>{
      data.forEach(item=>{
        if(item.recibe){
          this.encargados.push({nombre:item.nombre,key:item.$key,rol:item.rol});
          console.log(item.rol);
          if(item.rol=='admin'){
            this.admin=item.nombre
            this.adminKey=item.$key;
            console.log(this.admin);
          }
        }
      })
    });
  }

  //DEVUELVE LA KEY DEL USUARIO PASADO POR PARAMETRO
  cogerKeyUsuarioPorNombre(name){
    this.af.list('/users').subscribe(data=>{
      data.forEach(item=>{
        if(item.nombre==name){
          this.userKey=item.$key;
        }
      })
    })
  }
  //Menu que se muestra para seleccionar opcion de subida de foto
  public presentActionSheet() {
    let actionSheet = this.actionSheetCtrl.create({
      title: 'Seleccionar fuente ',
      buttons: [
        {
          text: 'Cargar desde galería',
          icon:'images',
          handler: () => {
            //;
            this.choosePicture()
          }
        },
        {
          text: 'Usar Camara',
          icon:'camera',
          handler: () => {
            this.takePicture();


          }
        },
        {
          text: 'Cancel',
          role: 'cancel'
        }
      ]
    });
    actionSheet.present();
  }

  //Abre la camara para sacar foto y la guarda en base64 en array photos
  takePicture(){
    this.camera.getPicture({
      destinationType: this.camera.DestinationType.DATA_URL,
      targetWidth: 1000,
      targetHeight: 1000
    }).then((imageData)=>{
      this.base64img="data:image/jpeg;base64,"+imageData;
    }),(err)=>{
      console.log(err);
    }
  }
  choosePicture(){
    this.camera.getPicture({
      sourceType: this.camera.PictureSourceType.PHOTOLIBRARY,
      destinationType: this.camera.DestinationType.DATA_URL,
      quality: 100,
      targetWidth: 1000,
      targetHeight: 1000
    }).then((imageData)=>{
      this.base64img="data:image/jpeg;base64,"+imageData;
    }),(err)=>{
      console.log(err);
    }
  }
  seleccionarUbicacion(){
    this.navCtrl.push(VistaUbicacion);

  }
  setUbicacionIncidencia(ubicacion){
    this.ubicacion=ubicacion;
  }

  writeToast(message) {
    let toast = this.toast.create({
      message: message,
      duration: 3000
    });
    toast.present();
  }

  getAdminDefault(){
    this.af.list('/users').forEach(data=>{
      data.forEach(campos=>{
        if(campos.default==1){
          console.log(data);
          this.adminDefault=campos.nombre;
          this.adminDefaultKey=campos.$key;
        }
        console.log(campos);
      })
      console.log(data);


    })
  }
}
