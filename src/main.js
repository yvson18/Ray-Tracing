function PutPixel(x,y,color){
    let c = document.getElementById("canvas");
    let ctx = c.getContext("2d");
    let r = Math.min(255, Math.max(0, Math.round(color.x * 255)));
    let g = Math.min(255, Math.max(0, Math.round(color.y * 255)));
    let b = Math.min(255, Math.max(0, Math.round(color.z * 255)));

    ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
    ctx.fillRect(x,y,1,2);
    
}

class Raio {
    constructor(origem, direcao){
        this.origem = origem;
        this.direcao = direcao;
    }
}

class Camera{
    constructor(){
        this.resolucaoX = 512;
        this.resolucaoY = 512;
        this.d = 1.0;
        this.xMin = -1.0;
        this.xMax = 1.0;
        this.yMin = -1.0;
        this.yMax = 1.0;
        this.k = new THREE.Vector3(this.xMin, this.yMax, -this.d);
        this.a = new THREE.Vector3(this.xMax - this.xMin, 0.0, 0.0);
        this.b = new THREE.Vector3(0.0, this.yMin - this.yMax, 0.0);

    }

    raio(x,y){
        let u = (x + 0.5) / this.resolucaoX;
        let v = (y - 0.5) / this.resolucaoY;

        let p = (this.a.clone().multiplyScalar(u)).add(this.b.clone().multiplyScalar(v)).add(this.k);

        let origem = new THREE.Vector3(0.0,0.0,0.0);
        let direcao = p.normalize();

        return new Raio(origem,direcao);
        
    }
}

class Interseccao{
    constructor() {
        this.t = Infinity;
        this.posicao = new THREE.Vector3(0.0,0.0,0.0);
        this.normal = new THREE.Vector3(0.0,0.0,0.0);
    }
}

class Esfera{
    constructor(centro, raio){
        this.centro = centro;
        this.raio= raio;
    }

    interseccionar(raio, interseccao){
        let A = raio.direcao.clone().dot(raio.direcao);
        let origem_centro = raio.origem.clone().sub(this.centro);
        let B = 2.0 * (raio.direcao.clone().dot(origem_centro));
        let C = origem_centro.clone().dot(origem_centro) - (this.raio**2);

        let disc  = B** 2 - 4 * A *  C;
        
        if(disc > 0.0){
            let t1 = (-B + Math.sqrt(disc)) / 2 * A;
            let t2 = (-B - Math.sqrt(disc)) / 2 * A;
            
            interseccao.t = t1;

            if((t2 > 0.001) && (t2 < t1)){
                interseccao.t = t2;
            }

            if(interseccao.t > 0.001){
                interseccao.posicao = raio.origem.clone().add(raio.direcao.clone().multiplyScalar(interseccao.t));
                interseccao.normal = interseccao.posicao.clone().sub(this.centro).normalize();
                return true;
            }

            return false;
        }
        return false;
    }    
}


class Triangulo{
    constructor(A, B, C){
        this.A = A;
        this.B = B;
        this.C = C;
    }
    interseccionar(raio, interseccao){
        //Etapa 1: Ver se o raio incide no plano
        // vetor normal ao plano normalizado 
        let orto_plano = ((this.C.clone().sub(this.A)).cross(this.B.clone().sub(this.A))).normalize();
        
        let t_denominador = raio.direcao.clone().dot(orto_plano);
        
        if(t_denominador === 0){ // raio paralelo ao plano
           return false;
        } 

        let t = (this.A.clone().dot(orto_plano) - raio.origem.clone().dot(orto_plano)) / t_denominador;
        interseccao.t = t;
        interseccao.posicao = raio.origem.clone().add(raio.direcao.clone().multiplyScalar(interseccao.t));
        
        //Etapa 2: Verifica se a intersecção está dentro do triangulo (usando coordenadas baricêntricas)
        // Achando coeficiente a
        let AB = this.B.clone().sub(this.A);
        let CB = this.B.clone().sub(this.C);

        let v1 = AB.clone().sub(AB.clone().projectOnVector(CB));
        
        let AI = interseccao.posicao.clone().sub(this.A);

        let a = 1 - (AI.clone().dot(v1) / AB.clone().dot(v1)); // coordenada baricêntrica referente a o ponto A
        
        //achando o coeficiente b
        let BC = this.C.clone().sub(this.B);
        let AC = this.C.clone().sub(this.A);
        
        let v2 = BC.clone().sub(BC.clone().projectOnVector(AC));

        let BI = interseccao.posicao.clone().sub(this.B);

        let b = 1 - (BI.clone().dot(v2) / BC.clone().dot(v2)); // coordenada baricêntrica referente a o ponto B

        // condição para o ponto estar dentro do triângulo
        if((a >= 0) && (b >= 0) && ((a+b) <= 1)){
            interseccao.normal = orto_plano;
            return true;
        }
    
        return false;
    }
}


class Luz {
    constructor(posicao, cor){
        this.posicao = posicao;
        this.cor = cor;  

    }
}


function Render_esfera(){
    let camera = new Camera();
    let luz  = new Luz(new THREE.Vector3(-10.0,10.0,4.0),new THREE.Vector3(0.8,0.8,0.8));

    let esfera = new Esfera(new THREE.Vector3(-0.0,0.0,-3.0),1.0);
    
    for(let y = 0; y < 512; y++){
        for(let x = 0; x < 512; x++){
           
            let raio = camera.raio(x,y);
            let interseccao = new Interseccao();
            
            if (esfera.interseccionar(raio, interseccao) === true){
                // Iluminação
                // Termo ambiente
                let ka =  new THREE.Vector3(1.0,0.0,0.0);
                let Ia =  new THREE.Vector3(0.2,0.2,0.2);
                let tA = Ia.clone().multiply(ka);

                // Termo difuso
                let kd =  new THREE.Vector3(1.0,0.0,0.0);
                let Ip = luz.cor;
                let L = (luz.posicao.clone().sub(interseccao.posicao)).normalize();
                let tD = (Ip.clone().multiply(kd)).multiplyScalar(Math.max(0.0,interseccao.normal.dot(L)));
                
                //Termo especular
                let ks =  new THREE.Vector3(1.0,1.0,1.0);
                let n = 32;
                let v = interseccao.posicao.clone().sub(raio.origem).normalize();
                let r = L.clone().multiplyScalar(1).reflect(interseccao.normal);
                let tE = (Ip.clone().multiply(ks)).multiplyScalar(Math.pow(Math.max(0.0,r.dot(v)),n));
                
                // I = tA + tD + tE
                let I = tA.add(tD).add(tE);
                PutPixel(x, y, I);

            }

        }
    }
}

function Render_triangulo(){
    let camera = new Camera();
    let luz  = new Luz(new THREE.Vector3(-10.0,10.0,4.0),new THREE.Vector3(0.8,0.8,0.8));

    let triangulo = new Triangulo( new THREE.Vector3(-1.0,-1.0,-3.5),
                                    new THREE.Vector3(1.0,1.0,-3.0),
                                    new THREE.Vector3(0.75,-1.0,-2.5));

    for(let y = 0; y < 512; y++){
        for(let x = 0; x < 512; x++){
           
            let raio = camera.raio(x,y);
            let interseccao = new Interseccao();
            
            if (triangulo.interseccionar(raio, interseccao) === true){
                // Iluminação
                // Termo ambiente
                let ka =  new THREE.Vector3(1.0,0.0,0.0);
                let Ia =  new THREE.Vector3(0.2,0.2,0.2);
                let tA = Ia.clone().multiply(ka);

                // Termo difuso
                let kd =  new THREE.Vector3(1.0,0.0,0.0);
                let Ip = luz.cor;
                let L = (luz.posicao.clone().sub(interseccao.posicao)).normalize();
                let tD = (Ip.clone().multiply(kd)).multiplyScalar(Math.max(0.0,interseccao.normal.dot(L)));
                
                //Termo especular
                let ks =  new THREE.Vector3(1.0,1.0,1.0);
                let n = 32;
                let v = interseccao.posicao.clone().multiplyScalar(-1).normalize();
                let r = L.clone().multiplyScalar(-1).reflect(interseccao.normal);
                let tE = (Ip.clone().multiply(ks)).multiplyScalar(Math.pow(Math.max(0.0,r.dot(v)),n));
                
                // I = tA + tD + tE
                let I = tA.add(tD).add(tE);
                PutPixel(x, y, I);

            }

        }
    }
}

function RenderUmbrella(triangulos){
    let camera = new Camera();
    let luz  = new Luz(new THREE.Vector3(-6.0,5.0,4.0),new THREE.Vector3(1.0,1.0,1.0));
    
    for(let y = 0; y < 512; y++){
        for(let x = 0; x < 512; x++){
           
            let raio = camera.raio(x,y);

            for(let i  = 0; i < triangulos.length; i++){
                let interseccao = new Interseccao();

                if(triangulos[i].triangulo.interseccionar(raio, interseccao) === true){
                    // Iluminação
                    // Termo ambiente
                    let ka =  triangulos[i].cor;
                    let Ia =  new THREE.Vector3(0.2,0.2,0.2);
                    let tA = Ia.clone().multiply(ka);

                    // Termo difuso
                    let kd =  triangulos[i].cor;
                    let Ip = luz.cor;
                    let L = (luz.posicao.clone().sub(interseccao.posicao)).normalize();
                    let tD = (Ip.clone().multiply(kd)).multiplyScalar(Math.max(0.0,interseccao.normal.dot(L)));

                    //Termo especular
                    let ks =  new THREE.Vector3(1.0,1.0,1.0);
                    let n = 28;
                    let v = interseccao.posicao.clone().multiplyScalar(-1).normalize();
                    let r = L.clone().multiplyScalar(-1).reflect(interseccao.normal);
                    let tE = (Ip.clone().multiply(ks)).multiplyScalar(Math.pow(Math.max(0.0,r.dot(v)),n));

                    // I = tA + tD + tE
                    let I = tA.add(tD).add(tE);
                    PutPixel(x, y, I);

                }
            }
        }
    }
}

function Render_BB8(objetos){
    let camera = new Camera();
    let luz  = new Luz(new THREE.Vector3(-10.0,10.0,4.0),new THREE.Vector3(1,0.8,0.1));

    
    
    for(let y = 0; y < 512; y++){
        for(let x = 0; x < 512; x++){
           
            let raio = camera.raio(x,y);
            let interseccao = new Interseccao();

            for(let i = 0; i < objetos.length; i++){
                if(objetos[i].tipo === 0){ // esfera
                    if (objetos[i].esfera.interseccionar(raio, interseccao) === true){
                        // Iluminação
                        // Termo ambiente
                        let ka = objetos[i].cor;
                        let Ia =  new THREE.Vector3(0.2,0.2,0.2);
                        let tA = Ia.clone().multiply(ka);
        
                        // Termo difuso
                        let kd = objetos[i].cor;
                        let Ip = luz.cor;
                        let L = (luz.posicao.clone().sub(interseccao.posicao)).normalize();
                        let tD = (Ip.clone().multiply(kd)).multiplyScalar(Math.max(0.0,interseccao.normal.dot(L)));
                        
                        //Termo especular
                        let ks =  new THREE.Vector3(1.0,1.0,1.0);
                        let n = 64;
                        let v = interseccao.posicao.clone().multiplyScalar(-1).normalize();
                        let r = L.clone().multiplyScalar(-1).reflect(interseccao.normal);
                        let tE = (Ip.clone().multiply(ks)).multiplyScalar(Math.pow(Math.max(0.0,r.dot(v)),n));
                        
                        // I = tA + tD + tE
                        let I = tA.add(tD).add(tE);
                        PutPixel(x, y, I);
        
                    }
                }

                if(objetos[i].tipo === 1){ // triangulo
                    if (objetos[i].triangulo.interseccionar(raio, interseccao) === true){
                        // Iluminação
                        // Termo ambiente
                        let ka = objetos[i].cor;
                        let Ia =  new THREE.Vector3(1,1,1);
                        let tA = Ia.clone().multiply(ka);
        
                        // Termo difuso
                        // let kd = objetos[i].cor;
                        // let Ip = luz.cor;
                        // let L = (luz.posicao.clone().sub(interseccao.posicao)).normalize();
                        // let tD = (Ip.clone().multiply(kd)).multiplyScalar(Math.max(0.0,interseccao.normal.dot(L)));
                        
                        // //Termo especular
                        // let ks =  new THREE.Vector3(1.0,1.0,1.0);
                        // let n = 32;
                        // let v = interseccao.posicao.clone().multiplyScalar(-1).normalize();
                        // let r = L.clone().multiplyScalar(-1).reflect(interseccao.normal);
                        // let tE = (Ip.clone().multiply(ks)).multiplyScalar(Math.pow(Math.max(0.0,r.dot(v)),n));
                        
                        // I = tA + tD + tE
                        let I = tA;
                        PutPixel(x, y, I);
        
                    }
                }
            }
        }
    }
} 

let triangulos = [
    //1
    {
        triangulo: new Triangulo(new THREE.Vector3(0.7,-0.3,-2.85), // M
                                 new THREE.Vector3(0.95,1.42,-3.16), // K
                                 new THREE.Vector3(1.79,0.8,-2.52)), // D

        cor: new THREE.Vector3(1.0,0.0,0.0) // Azul
    
    },
    //2
    {
        triangulo: new Triangulo(new THREE.Vector3(0.7,-0.3,-2.85), // M
                                 new THREE.Vector3(1.79,0.8,-2.52), // D
                                 new THREE.Vector3(1.8,-0.17,-2.24)), // E

        cor: new THREE.Vector3(0.75,0.75,0.75) // Azul
    
    },
    //3
    {
        triangulo: new Triangulo(new THREE.Vector3(0.7,-0.3,-2.85), // M
                                 new THREE.Vector3(1.8,-0.17,-2.24), // E
                                 new THREE.Vector3(1.19,-1.2,-2.17)), // F

        cor: new THREE.Vector3(1.0,0.0,0.0) // Azul
    
    },
    //4
    {
        triangulo: new Triangulo(new THREE.Vector3(0.7,-0.3,-2.85), // M
                                 new THREE.Vector3(1.19,-1.2,-2.17), // F
                                 new THREE.Vector3(0.06,-1.6,-2.82)), // G

        cor: new THREE.Vector3(0.75,0.75,0.75) // Azul
    
    },
    //5
    {
        triangulo: new Triangulo(new THREE.Vector3(0.7,-0.3,-2.85), // M
                                 new THREE.Vector3(0.06,-1.6,-2.82), // G
                                 new THREE.Vector3(-1.0,-0.75,-3.46)), // H

        cor: new THREE.Vector3(1.0,0.0,0.0) // Azul
    
    },
    //6
    {
        triangulo: new Triangulo(new THREE.Vector3(0.7,-0.3,-2.85), // M
                                 new THREE.Vector3(-1.0,-0.75,-3.46), // H
                                 new THREE.Vector3(-1,0.4,-3.87)), // I

        cor: new THREE.Vector3(0.75,0.75,0.75) // Azul
    
    },
    //7
    {
        triangulo: new Triangulo(new THREE.Vector3(0.7,-0.3,-2.85), // M
                                 new THREE.Vector3(-1,0.4,-3.87), // I
                                 new THREE.Vector3(0,1.37,-3.69)), // J

        cor: new THREE.Vector3(1.0,0.0,0.0) // Azul
    
    },
    //8
    {
        triangulo: new Triangulo(new THREE.Vector3(0.7,-0.3,-2.85), // M
                                 new THREE.Vector3(0,1.37,-3.69), // J
                                 new THREE.Vector3(0.95,1.42,-3.16)), // J

        cor: new THREE.Vector3(0.75,0.75,0.75) // Azul
    
    },

];


let bb8 = [
    
    {
        tipo: 0,
        esfera: new Esfera(new THREE.Vector3(0.0,-1.0,-3.0),1.0),
        cor: new THREE.Vector3(0.75,0.75,0.75) // branco
    },
    {
        tipo: 1,
        triangulo: new Triangulo(new THREE.Vector3(0.35,-1.0,-2.0), // A
                                 new THREE.Vector3(0.35,-0.2,-2.0), // B
                                 new THREE.Vector3(0.69,-0.95,-2.0)), // C

        cor: new THREE.Vector3(1.0,0.3,0.0) // Azul
    
    },
    {
        tipo: 1,
        triangulo: new Triangulo(new THREE.Vector3(-0.35,-1.0,-2.0), // A
                                 new THREE.Vector3(-0.35,-0.2,-2.0), // B
                                 new THREE.Vector3(-0.69,-0.95,-2.0)), // C

        cor: new THREE.Vector3(1.0,0.3,0.0) // Azul
    
    },

    {
        tipo: 1,
        triangulo: new Triangulo(new THREE.Vector3(-0.0,-0.5,-1.0), // A
                                 new THREE.Vector3(0.53,-1.27,-2.0), // B
                                 new THREE.Vector3(-0.53,-1.27,-2.0)), // C

        cor: new THREE.Vector3(1.0,0.3,0.0) // Azul
    
    },

    

    {
        tipo: 0,
        esfera: new Esfera(new THREE.Vector3(0.0,-0.0,-3.0),0.75),
        cor: new THREE.Vector3(0.75,0.75,0.75) // branco
    },

    {
        tipo: 1,
        triangulo: new Triangulo(new THREE.Vector3(-0.085,0.17,-1.0), // A
                                 new THREE.Vector3(-0.1,0.49,-2.0), // B
                                 new THREE.Vector3(-0.32,0.39,-2.0)), // C

        cor: new THREE.Vector3(1.0,0.3,0.0) // laranja
    
    },
    {
        tipo: 1,
        triangulo: new Triangulo(new THREE.Vector3(0.085,0.17,-1.0), // A
                                 new THREE.Vector3(0.1,0.49,-2.0), // B
                                 new THREE.Vector3(0.32,0.39,-2.0)), // C

        cor: new THREE.Vector3(1.0,0.3,0.0) // laranja
    
    },

    {
        tipo: 1,
        triangulo: new Triangulo(new THREE.Vector3(0.0,0.5,-1.0), // A
                                 new THREE.Vector3(-0.04,0.6,-2.0), // B
                                 new THREE.Vector3(0.0,0.5,-2.0)), // C

        cor: new THREE.Vector3(0.3,0.3,0.3) // cinza escuro
    
    },
    {
        tipo: 0,
        esfera: new Esfera(new THREE.Vector3(0.0,0.1,-2.0),0.15),
        cor: new THREE.Vector3(0.3,0.3,0.3) // cinza escuro
    },

    

    {
        tipo: 0,
        esfera: new Esfera(new THREE.Vector3(0.22,-0.115,-2.0),0.08),
        cor: new THREE.Vector3(0.25,0.25,0.25) // branco
    },

    


   
];


//Render_esfera();
//Render_triangulo();
//RenderUmbrella(triangulos)
Render_BB8(bb8);
