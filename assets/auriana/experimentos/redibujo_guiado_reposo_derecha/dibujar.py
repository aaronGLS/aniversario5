"""Ensayo de redibujo guiado, 64x64, con Pillow y biblioteca estandar.

Se calca la silueta/alfa del reposo lateral para fijar las proporciones.
Los interiores se dibujan con regiones, curvas medidas y parches locales.
No se usa el RGB de la referencia en dibujar(); solo en el control automatico
y en las comparativas. No es un redibujo independiente de la silueta.
Todos los archivos de salida se escriben en esta carpeta experimental.
"""

from hashlib import sha256
from io import BytesIO
import json
from math import hypot
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw


CARPETA = Path(__file__).resolve().parent
RAIZ = CARPETA.parents[3]
FUENTE = RAIZ / "assets/auriana/frames/reposo/derecha/frame_000.png"
ANTERIOR = RAIZ / "assets/auriana/experimentos/redibujo_reposo_derecha/frame_000.png"
FRENTE = RAIZ / "assets/auriana/frames/reposo/frente/frame_000.png"
PALETA = {
    "0": (28, 17, 28, 255), "1": (38, 23, 31, 255),
    "2": (41, 32, 50, 255), "3": (45, 24, 38, 255),
    "4": (59, 44, 73, 255), "5": (61, 34, 51, 255),
    "6": (62, 36, 45, 255), "7": (87, 48, 63, 255),
    "B": (107, 60, 75, 255), "C": (116, 64, 52, 255),
    "D": (130, 72, 82, 255),
    "F": (164, 89, 93, 255), "A": (105, 64, 121, 255),
    "E": (148, 92, 167, 255), "H": (174, 121, 188, 255),
    "I": (193, 142, 205, 255), "J": (197, 139, 142, 255),
    "K": (213, 166, 221, 255), "L": (230, 139, 105, 255),
    "N": (232, 213, 216, 255), "O": (245, 154, 133, 255),
    "S": (255, 199, 149, 255), "T": (255, 204, 159, 255),
    "U": (255, 213, 166, 255), "V": (255, 247, 236, 255),
}

# Areas trazadas a partir de la referencia de reposo, en coordenadas nativas.
POLIGONOS_CABELLO = (
    ("6", [(20,15),(25,11),(31,9),(36,8),(33,12),(29,16),
           (25,19),(21,23),(18,24),(18,20)]),
    ("3", [(25,29),(31,27),(32,33),(30,39),(30,46),(27,48),
           (23,47),(22,43),(23,38),(22,34)]),
    ("6", [(26,24),(29,25),(29,28),(26,32),(27,35),(25,38),
           (25,40),(27,42),(27,45),(26,47),(24,46),(23,42),
           (24,38),(23,35),(24,30)]),
    ("6", [(15,26),(18,25),(19,28),(17,31),(17,33),(20,35),
           (19,38),(17,39),(16,37),(14,36),(14,33),(15,30)]),
    ("6", [(17,41),(20,39),(22,40),(22,43),(20,45),(18,45),
           (18,43),(16,44)]),
    ("3", [(41,30),(42,32),(44,33),(46,35),(46,39),(43,40),
           (42,38),(44,37),(44,35),(42,34),(40,33)]),
    ("7", [(43,33),(45,34),(46,36),(45,38),(43,39),(43,38),
           (44,37),(44,35),(42,34)]),
)

# Curvas cubicas: color, grosor nativo, cuatro puntos de control medidos.
CURVAS = (
    ("6",1,((38,7),(35,8),(32,12),(28,14))),
    ("6",1,((28,14),(24,17),(22,19),(20,21))),
    ("3",1,((21,22),(22,25),(21,27),(19,29))),
    ("3",1,((19,29),(17,31),(18,33),(20,34))),
    ("3",1,((24,25),(22,28),(22,30),(24,32))),
    ("3",1,((24,32),(26,34),(25,36),(23,37))),
    ("3",1,((23,37),(22,39),(24,41),(24,42))),
    ("6",1,((16,28),(15,29),(15,30),(17,31))),
    ("3",1,((18,35),(17,37),(17,39),(19,40))),
    ("3",1,((21,40),(23,42),(21,44),(20,45))),
    ("6",1,((42,13),(42,17),(40,19),(37,20))),
    ("3",1,((37,20),(35,22),(31,23),(28,22))),
)

# Silueta interior de la piel: no se pega la cara del frontal ni se deforma.
PIEL = (
    (15,42,"L"), (16,42,"LO"), (17,42,"TOL"),
    (18,41,"TTTS"), (19,40,"STTTT"), (20,43,"T"),
    (21,42,"TT"), (22,42,"TT"), (23,35,"LLVV111TT"),
    (24,35,"SSVV1CCTTL"), (25,35,"SOOVCCTTTT"),
    (26,36,"OOOOSTTTT"), (27,37,"OOSTTTTT"),
    (28,37,"TTTTTTTT"), (29,37,"TTTTTTS"),
    (30,37,"TUUUUL"), (31,37,"L"),
)

# Parches chicos que fijan ojo, oreja, borde del mechon y brillos del pelo.
DETALLES_CARA = (
    (20,36,"0000000"), (21,37,"01110"),
    (22,37,"V11V0"), (23,37,"V1110"),
    (24,37,"V1CC0"), (25,38,"VCCU"),
    (23,28,"SL"), (24,28,"TL"), (25,28,"SL"), (26,29,"O"),
    (22,30,"016610"), (23,30,"067710"), (24,30,"067710"),
    (25,30,"067710"), (26,30,"0677710"),
    (27,31,"067771"), (28,31,"067776"),
    (29,31,"006776"), (30,32,"037730"),
    (31,33,"0660"), (32,33,"6610"),
    (8,21,"D"), (9,20,"FD"), (10,20,"FF"), (11,21,"D"),
    (12,22,"D"), (12,40,"D"), (13,40,"DDD"),
    (12,46,"F"), (13,45,"FD"),
)

ROPA = (
    ("2", [(28,47),(39,47),(40,49),(40,53),(38,54),(28,54)]),
    ("4", [(30,49),(36,49),(36,53),(30,53)]),
    ("4", [(38,49),(39,49),(39,53),(38,53)]),
)

# Las dos regiones solicitadas por el usuario se trazan fila a fila sobre
# la guia medida. Se conservan cabeza, cara, cabello y pantalon de base_guiada.
SUETER = (
    (32,36,"0AAA0"),
    (33,34,"0EHKHE0"),
    (34,32,"0EIEEEE0"),
    (35,31,"0HIKIEIIIH0"),
    (36,31,"0HIIIEIIIH0"),
    (37,30,"0HIIIIIEIIIH0"),
    (38,30,"0HIIIIIAIIIH0"),
    (39,30,"0HIIIIIAIIIH0"),
    (40,29,"0AIIIIIIAIIIH0"),
    (41,29,"0AIIIIIIAIIIH0"),
    (42,27,"0E0A" + "HIIIII" + "AAIIH0"),
    (43,27,"0E0A" + "HIIIII" + "A0IIH0"),
    (44,26,"0EEE0" + "EEEEEE0" + "EEEE0"),
    (45,25,"0IEIE0" + "HIEIIE0" + "IEII0"),
    (46,25,"0AHEHA0" + "AAAA00" + "IEII0"),
)

ZAPATOS = (
    (54,28,"0LLLLLEEE0L0"),
    (55,28,"0LSSSSHVN0H0"),
    (56,27,"00HKVVVVHK00H00"),
    (57,27,"00HHVVVVHKV00H0"),
    (58,27,"00HHVVVVVVVV0NN0"),
    (59,27,"00EEKKKKVVVH0HH0"),
    (60,27,"00EEKKKKVVVH0H00"),
    (61,28,"00000000000000"),
)

DETALLES_ROPA = (
    (47,31,"0LSSS1000100"),
    (48,32,"0OTL03330"),
    (49,28,"022444440440"), (50,28,"024444440440"),
    (51,28,"024444440440"), (52,28,"024444440440"),
    (53,28,"000000000000"),
)


def curva(dibujo, color, ancho, puntos):
    """Rasteriza una curva cubica sobre la cuadricula; sin antialias ni resize."""
    muestras = []
    for paso in range(97):
        t = paso / 96
        u = 1-t
        pesos = (u**3, 3*u*u*t, 3*u*t*t, t**3)
        xy = tuple(round(sum(pesos[i]*puntos[i][j] for i in range(4))) for j in (0,1))
        if not muestras or xy != muestras[-1]:
            muestras.append(xy)
    dibujo.line(muestras, fill=PALETA[color], width=ancho)


def parches(imagen, filas):
    pixeles = imagen.load()
    for y,x0,fila in filas:
        for x,simbolo in enumerate(fila,x0):
            assert 0 <= x < 64 and 0 <= y < 64
            pixeles[x,y] = PALETA[simbolo]


def dibujar(alfa):
    """Alfa trazado y rellenos propios; no recibe el RGB de la fuente."""
    imagen = Image.new("RGBA",(64,64),PALETA["7"])
    dibujo = ImageDraw.Draw(imagen)
    for color,poligono in POLIGONOS_CABELLO:
        dibujo.polygon(poligono,fill=PALETA[color])
    for color,ancho,puntos in CURVAS:
        curva(dibujo,color,ancho,puntos)
    for color,poligono in ROPA:
        dibujo.polygon(poligono,fill=PALETA[color])
    parches(imagen,PIEL)
    parches(imagen,DETALLES_CARA)
    parches(imagen,SUETER)
    parches(imagen,ZAPATOS)
    parches(imagen,DETALLES_ROPA)
    # Un pixel de contorno exterior; el alfa fuente fija el encuadre y los huecos.
    px = imagen.load()
    a = alfa.load()
    for y in range(64):
        for x in range(64):
            if not a[x,y]:
                px[x,y] = (0,0,0,0)
            elif any(not (0 <= x+dx <64 and 0 <= y+dy <64) or not a[x+dx,y+dy]
                     for dx,dy in ((-1,0),(1,0),(0,-1),(0,1))):
                px[x,y] = PALETA["0"]
    return imagen


def control_automatico(fuente):
    paleta = Image.new("P",(1,1))
    valores = [v for rgba in PALETA.values() for v in rgba[:3]]
    paleta.putpalette(valores + list(PALETA["0"][:3]) * (256-len(PALETA)))
    resultado = fuente.convert("RGB").quantize(palette=paleta,dither=Image.Dither.NONE).convert("RGBA")
    resultado.putalpha(fuente.getchannel("A"))
    limpio = Image.new("RGBA",(64,64))
    limpio.paste(resultado,(0,0),fuente.getchannel("A"))
    return limpio


def fondo(lado=512):
    imagen=Image.new("RGBA",(lado,lado),(234,231,239,255))
    dibujo=ImageDraw.Draw(imagen)
    for y in range(0,lado,16):
        for x in range(0,lado,16):
            if (x//16+y//16)%2:
                dibujo.rectangle((x,y,x+15,y+15),fill=(217,213,224,255))
    return imagen


def guardar_png(imagen,nombre,optimize=False):
    """Exporta sin reabrir para escritura una vista previa identica en uso."""
    memoria=BytesIO()
    imagen.save(memoria,format='PNG',optimize=optimize)
    datos=memoria.getvalue()
    destino=CARPETA/nombre
    if destino.exists() and destino.read_bytes()==datos:
        return
    temporal=destino.with_suffix('.tmp.png')
    temporal.write_bytes(datos)
    temporal.replace(destino)


def comparar(muestras,nombre):
    panel=Image.new("RGBA",(len(muestras)*528,592),(250,248,252,255))
    d=ImageDraw.Draw(panel)
    for i,(titulo,imagen) in enumerate(muestras):
        x=i*528+8
        d.text((x+6,12),titulo,fill=(42,31,49),font_size=18)
        cuadro=fondo()
        cuadro.alpha_composite(imagen.resize((512,512),Image.Resampling.NEAREST))
        panel.alpha_composite(cuadro,(x,48))
        d.text((x+6,567),"64 x 64; ampliacion 8x sin suavizado",fill=(67,52,76),font_size=14)
    guardar_png(panel,nombre)


def coordenadas(imagen, predicado, roi):
    x0,y0,x1,y1=roi
    return {(x,y) for y in range(y0,y1) for x in range(x0,x1)
            if imagen.getpixel((x,y))[3] and predicado(imagen.getpixel((x,y))[:3])}


def resumir(puntos):
    if not puntos:
        return {"pixeles":0,"bbox":None,"centro":None}
    xs,ys=zip(*puntos)
    return {"pixeles":len(puntos),"bbox":[min(xs),min(ys),max(xs)+1,max(ys)+1],
            "centro":[round(sum(xs)/len(xs),3),round(sum(ys)/len(ys),3)]}


def medir(fuente,anterior,nuevo,control):
    alfa=lambda im: coordenadas(im,lambda c:True,(0,0,64,64))
    original=alfa(fuente)
    piel=lambda c:c[0]>155 and c[1]>95 and c[0]-c[1]>25 and c[1]-c[2]>10
    sueter=lambda c:c[0]>80 and c[2]-c[1]>25 and c[0]-c[1]>20
    zonas={"piel_cara":(piel,(34,15,47,32)),"mano":(piel,(30,46,38,50)),
           "sueter":(sueter,(25,32,44,48))}
    informe={"nota":"IoU de silueta nuevo=1 por construccion: se calca el alfa. No demuestra calidad artistica.",
             "metodo":"Interiores manuales por regiones/curvas/parches; RGB fuente no entra en dibujar().",
             "fuente":{},"anterior":{},"nuevo":{},"control_automatico":{}}
    for nombre,im in (("fuente",fuente),("anterior",anterior),("nuevo",nuevo),("control_automatico",control)):
        mascara=alfa(im)
        datos={"bbox":im.getbbox(),"colores":len(set(im.get_flattened_data())),
               "pixeles_opacos":len(mascara),
               "silueta_iou":round(len(mascara&original)/len(mascara|original),5),
               "pixeles_silueta_distintos":len(mascara^original),"regiones":{}}
        for zona,(pred,roi) in zonas.items():
            pts=coordenadas(im,pred,roi)
            referencia=coordenadas(fuente,pred,roi)
            stats=resumir(pts)
            base=resumir(referencia)
            stats["error_centro_px"]=round(hypot(*(stats["centro"][i]-base["centro"][i] for i in (0,1))),3) if pts else None
            datos["regiones"][zona]=stats
        informe[nombre]=datos
    informe["nuevo_vs_control_pixeles_rgb_distintos"]=sum(a[:3]!=b[:3] for a,b in zip(nuevo.get_flattened_data(),control.get_flattened_data()) if a[3] or b[3])
    informe["limites"]="Clasificacion de regiones por umbrales iguales, no evaluacion perceptual. Puede variar con el sombreado. Sin prueba de animacion o navegador."
    return informe


def main():
    protegidos=json.loads((CARPETA/'integridad_antes.json').read_text(encoding='utf-8'))
    for ruta,esperado in protegidos.items():
        assert sha256((RAIZ/ruta).read_bytes()).hexdigest()==esperado, f"Cambio concurrente: {ruta}"
    fuente=Image.open(FUENTE).convert("RGBA")
    anterior=Image.open(ANTERIOR).convert("RGBA")
    frente=Image.open(FRENTE).convert("RGBA")
    nuevo=dibujar(fuente.getchannel("A"))
    control=control_automatico(fuente)
    assert nuevo.size==(64,64) and nuevo.mode=='RGBA'
    assert set(nuevo.getchannel('A').get_flattened_data())=={0,255}
    assert nuevo.getchannel('A').tobytes()==fuente.getchannel('A').tobytes()
    assert set(nuevo.get_flattened_data())<=set(frente.get_flattened_data())
    base=Image.open(CARPETA/'base_guiada.png').convert('RGBA')
    diferencias=[(x,y) for y in range(64) for x in range(64)
                 if nuevo.getpixel((x,y))!=base.getpixel((x,y))]
    assert all((25<=x<44 and 32<=y<47) or (27<=x<44 and 54<=y<62)
               for x,y in diferencias), 'Retoque fuera de sueter/zapatos'
    guardar_png(nuevo,'frame_000.png',optimize=True)
    guardar_png(nuevo.resize((512,512),Image.Resampling.NEAREST),'vista_8x.png')
    comparar((("Referencia: reposo lateral",fuente),("Intento anterior rechazado",anterior),("Nuevo: dibujo guiado",nuevo)),"comparacion.png")
    comparar((("Control: conversion automatica",control),("Nuevo: dibujo guiado",nuevo),("Estilo: frontal pixel art",frente)),"control.png")
    detalle=Image.new('RGBA',(1056,590),(245,242,249,255))
    dd=ImageDraw.Draw(detalle)
    for fila,(region,caja) in enumerate((('Sueter',(24,31,45,49)),('Zapatos',(26,52,45,63)))):
        for columna,(nombre,im) in enumerate((('Referencia',fuente),('Base guiada',base),('Retoque',nuevo))):
            x=columna*352+8
            y=fila*300
            dd.text((x,y+5),region+' - '+nombre,fill=(35,25,40),font_size=16)
            recorte=im.crop(caja).resize(((caja[2]-caja[0])*16,(caja[3]-caja[1])*16),Image.Resampling.NEAREST)
            cuadrado=Image.new('RGBA',recorte.size,(216,212,223,255))
            cuadrado.alpha_composite(recorte)
            detalle.alpha_composite(cuadrado,(x,y+30))
    guardar_png(detalle,'detalles.png')
    guia=fondo()
    guia.alpha_composite(fuente.resize((512,512),Image.Resampling.NEAREST))
    d=ImageDraw.Draw(guia)
    for i in range(0,513,8):
        d.line((i,0,i,511),fill=(100,100,115,65))
        d.line((0,i,511,i),fill=(100,100,115,65))
    for texto,(x,y) in {'ojo':(39,23),'oreja':(28,24),'menton':(40,30),'mano':(34,48),'puntera':(42,59)}.items():
        d.rectangle((x*8,y*8,x*8+7,y*8+7),outline=(24,180,150,255),width=1)
        d.text((x*8+10,y*8-5),texto,fill=(20,125,110,255),font_size=12)
    guardar_png(guia,'guia.png')
    informe=medir(fuente,anterior,nuevo,control)
    informe['integridad']={"archivos_protegidos":len(protegidos),"resultado":"PASS"}
    informe['formato']={"dimensiones":[64,64],"modo":"RGBA","alfa":[0,255],"paleta_frontal":"PASS"}
    informe['retoque_solicitado']={'pixeles_modificados':len(diferencias),'fuera_de_sueter_zapatos':0,
                                 'cabeza_cara_pantalon_mano_conservados':'PASS',
                                 'base_sha256':sha256((CARPETA/'base_guiada.png').read_bytes()).hexdigest()}
    for ruta,esperado in protegidos.items():
        assert sha256((RAIZ/ruta).read_bytes()).hexdigest()==esperado, f"Original alterado: {ruta}"
    assert Image.open(CARPETA/'vista_8x.png').tobytes()==nuevo.resize((512,512),Image.Resampling.NEAREST).tobytes()
    (CARPETA/'mediciones.json').write_text(json.dumps(informe,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    print(json.dumps(informe,indent=2,ensure_ascii=False))


if __name__=='__main__':
    main()
