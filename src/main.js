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

    for(let y = 0; y < 512; y++){
        for(let x = 0; x < 512; x++){

            let raio = camera.raio(x,y);
            let interseccao = new Interseccao();
            // testa se ocorreu interseccao
            if(esfera.interseccionar(raio, interseccao) == true){
                let ka =  new THREE.Vector3(1.0,0.0,0.0);
                let kd =  new THREE.Vector3(1.0,0.0,0.0);
                let Ia =  new THREE.Vector3(0.2,0.2,0.2);

                let ambient = Ia.clone().multiply(ka);

                let L = (luz.posicao.clone().sub(interseccao.posicao)).normalize();

                let difuso = (luz.cor.clone().multiply(kd)).multiplyScalar(Math.max(0.0,interseccao.normal.dot(L)));
                
                PutPixel(x, y, difuso.add(ambient));
            }else{
                PutPixel(x, y, new THREE.Vector3(0.0,0.0,0.0));
            }
        }
    }
}

Render();