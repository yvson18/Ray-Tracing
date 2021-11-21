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

function areaTriangulo(p1 ,p2, p3){
    return ((p2.clone().sub(p1)).cross((p3.clone().sub(p1)))).length() * 0.5;
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
            console.log("entrei1");
            return false;
        } 

        let t = (this.A.clone().dot(orto_plano) - raio.origem.clone().dot(orto_plano)) / t_denominador;
        interseccao.t = t;
        interseccao.posicao = raio.origem.clone().add(raio.direcao.clone().multiplyScalar(interseccao.t));
        
        //Etapa 2: Verifica se a intersecção está dentro do triangulo
        
        if((areaTriangulo(this.A,this.B, interseccao.posicao) + areaTriangulo(this.A, this.C, interseccao.posicao) 
            + areaTriangulo(this.B, this.C, interseccao.posicao)) === areaTriangulo(this.A, this.B, this.C)){
            interseccao.normal = orto_plano;
            return true;
        }else{
            console.log("entrei2");
            return false;
        }
              
    }
}


class Luz {
    constructor(posicao, cor){
        this.posicao = posicao;
        this.cor = cor;  

    }
}

function Render(){
    let camera = new Camera();
    let esfera = new Esfera(new THREE.Vector3(0.0,0.0,-3.0),1.0);
    let luz  = new Luz(new THREE.Vector3(-10.0,10.0,4.0),new THREE.Vector3(1.0,1.0,1.0));
    let triangulo = new Triangulo(new THREE.Vector3(-1.0,-1.0,-3.5),new THREE.Vector3(1.0,1.0,-3.0),new THREE.Vector3(0.75,-1.0,-2.5));

    
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

            }else{
                PutPixel(x, y, new THREE.Vector3(0.0,0.0,0.0));
            }
        }
    }
}

Render();