import type { Geometry } from "geojson";

/**
 * PDD boundary snapshot derived from:
 * EVR_PDD_Boundaries_ALL_136plots_2026-09-21.kmz
 * SHA256: 1a728842d4760f88f7eb2c3caf346614bede648c259ccdbf03f66680277aa426
 * Source KMZ contains 136 plots in WGS84 (EPSG:4326).
 * This app currently imports only its province scope:
 * Rayong 19, Trat 8, Chanthaburi 0.
 *
 * Coordinates are encoded with Google polyline precision 6 to keep the
 * Worker bundle small. The decoded output is GeoJSON [longitude, latitude].
 */

type EncodedBoundary = {
  p: "RAYONG" | "CHANTHABURI" | "TRAT";
  t: "Polygon" | "MultiPolygon";
  r: string[][];
  a: number;
  d: number | null;
};

const SOURCE_SHA256 = "1a728842d4760f88f7eb2c3caf346614bede648c259ccdbf03f66680277aa426";
const SOURCE_DATE = "2026-09-21";

const DATA: Record<string, EncodedBoundary> = {"1-VSD":{"p":"TRAT","t":"MultiPolygon","r":[["iwxeV_meybE@_f@~t@iI~IzYpGlJshA~I"],["o}weVgeiybEdWhu@{r@fMl@{`@iDoVp^eJ"]],"a":9.479787,"d":9.47},"2-VSD":{"p":"TRAT","t":"MultiPolygon","r":[["sjneVqulybE`dArSPpCiGvO~AvTs_Ah`@sZs{@|Zkc@"],["otoeViahybEiFkOruBs~@xLdXlBbMq_Ctg@"],["_goeVo|jybE~Upk@cm@|VcWqs@pMsFbDlBpZwJ"]],"a":24.642356,"d":24.64},"3-VSD":{"p":"TRAT","t":"MultiPolygon","r":[["qzdeVoxlybEsE~Ua\\pFwMyi@fl@{Et@|EnBdK"],["kgeeVizkybEin@|Q[}@vm@{Rl@zA"],["_}feVojkybE}Lkf@lEqF`UkGzLpg@m[vM"],["w`geVibkybEc\\dLqIya@~Z}LtJpb@"],["snheVwrkybEpJd_@yYdIeI}^lXmI"]],"a":10.403526,"d":10.42},"4-VSD":{"p":"TRAT","t":"MultiPolygon","r":[["wugeVwviybEcDmHbEiHbIuFjRuFxBAx@lBzNd\\s@hEk@hAo^lIeB_@wDuAqGyL"],["k~feVwggybEoJTkStNyDw@mGcKsCsNpr@oj@d`@aKd@rCcJ`o@aW~N"],["i`heV}|iybEzMvV[fH}A~Bo`@j]uFfCaDVeDgBoGeIuEyMYqFdAyBrd@qa@rIG|D`A"],["qsjeVitgybEnRhQePvW}TyNrRgZ"],["gdkeVekeybE{V{OdPeXvUxNaOfY"],["kgkeViieybEcK~PkZ_SvHeNv\\dP"]],"a":21.617641,"d":21.66},"5-VSD":{"p":"TRAT","t":"MultiPolygon","r":[["abceVohgybEiCjMeK}B}T_JJcFnB{BAaB`Ec]pEoAvTfGgCd]nCxG"],["}}ceVammybEnb@fBd@hBuGhvAeL\\{b@gJ}CeDlTijApCaB"],["}xceVgdiybEci@sKnK_a@dBYxg@nKtMeCqDzn@cQeEkDqA"],["sqeeViygybEcCqFxJs^xD{B~]pIjAhFyHpc@sGj@m[wK"]],"a":20.16789,"d":20.21},"6-VSD":{"p":"TRAT","t":"MultiPolygon","r":[["qe}lVa{}abEsFgWxi@sf@jJlUqm@lh@"],["{t}lVul_bbE|d@ye@vJxS}i@zf@wE{T"],["yb}lVcxabbElRzZ{b@~`@kRkXxb@oc@"],["{g_mVeq_bbEsNisBlg@iErL`r@kYvGpN|q@sZzJ"]],"a":15.778853,"d":15.79},"7-VSD":{"p":"TRAT","t":"Polygon","r":[["kbvfVo`oobE|NjFzSaZ~MqYmR{CoBvBsJfSgPbZ"]],"a":2.355186,"d":2.35},"8-VSD":{"p":"TRAT","t":"MultiPolygon","r":[["aw~dVenkybElB{Bb\\S~@dBt@~VmBvAg[fCwCkADiZ"],["qt_eVmtkybElU`@tClCKh\\sCdAuVnBuBeAVqb@nCwA"]],"a":4.431029,"d":4.44},"13-STC":{"p":"RAYONG","t":"MultiPolygon","r":[["kvpfWu{|}`EbkAzeF{lAvp@sq@pe@qj@p_A}ZlWur@inAzoFmaC}@}Dok@vWupBq_FmvAioD_@}Enk@`D`JtVt~Bx`D"],["m`yfWuay}`Eb`ApzApr@jzAlFcHaqB{{Ed`DgqA}B~@xmBh_F_qDf_B}Fq@}^{h@aH_Gy_Eg}@o@rCzO_r@r]sIxr@wn@rHBda@`X"],["m{zfW{vq}`EhSfC~yDd}@oa@rjBwbAcSS\\{GeBiuD}v@nJwT`j@cRd_@{u@" ,"o}{fWwbt}`EgSvl@pHhDtNqn@_DoB"]],"a":259.89251,"d":289.89},"14(1)-STC":{"p":"RAYONG","t":"Polygon","r":[["sxseWwot|`Egm@fe@htAbvA|a@s_@_iAw{A"]],"a":12.473663,"d":12.47},"14-STC":{"p":"RAYONG","t":"MultiPolygon","r":[["e}wfWixg~`ErHjAWbOuImAx@aO"],["kfyfWs{g~`EtMes@t_@jCaLf_A_Z{GiFqF"]],"a":4.485625,"d":4.48},"14-VSD":{"p":"RAYONG","t":"MultiPolygon","r":[["auggWouv~`E~@pGmrAxZk@bJqTbEdZalAs@QiVl_AmEvFV`GcFtCgLo@jBoEdFnAFqDkE{B`d@efBbB_@GuAe{@qNz@gZvoAaGvNfLhUzh@vWjr@aBn@r@vB"],["sakgW_ut~`EbOgEtNtE|CbxB_z@uZeG{BxEgSrVwdA"],["mfkgWmnt~`Ec[hqAaOqFx@mDrWmjAvPbE"]],"a":39.035677,"d":39.03},"15-STC":{"p":"RAYONG","t":"Polygon","r":[["{_shWyptcaEdG_@|F~BrBjHfGrClVaGfCpCdGO|PrA`A_HbNBqEw_@etArOsGEj@pH"]],"a":5.078832,"d":5.07},"15-VSD":{"p":"RAYONG","t":"Polygon","r":[["iizgWo_q~`Ep{@ulDc`AqPTmE`i@vLfIeXtRtI}@jPrMlCb`A{j@VOe{@qRfRsp@eOi@e@bDmHjFiNfF?xDsHdE|CbIkE_DcKSeMiCmYtAaFjDg@vOeB`MmZfE_LlCwGtHA`C|JvDQdBpBnC[pE~Bz@kI|Yb]dHob@~eBpCrAyG~Lz}@rQ"]],"a":46.476708,"d":46.47},"16-STC":{"p":"RAYONG","t":"Polygon","r":[["os_hWsdl_aEmOhJwCjQvXbU}A|MUzEhKrNpoAbMhB|I_Ah\\`_AvZfEqCxAev@yj@mVbCuOnHqj@wSeJeDbDg@rKcM^wDhI_zAyl@"]],"a":27.055938,"d":27.05},"16-VSD":{"p":"RAYONG","t":"MultiPolygon","r":[["mi}gWqsj~`ETChCeGfYxG}Vh}AiKgB{PmPhBiMy@i@jToy@"],["}y}gWkij~`EuSdv@ulAyaB`D_Gh|Arr@"],["yiahWw~f~`EtbBhNiApDwB]o@vCnBLmAvCm|AfEcAkCmAkZxCkC"]],"a":12.037472,"d":12.03},"17-STC":{"p":"RAYONG","t":"MultiPolygon","r":[["_osgWsxa}`EdObN|Rng@lUvJvTb]|jAnXxn@nRh`@JjUnPshAhoAwGn^fM~c@bFvpAxj@fnAuKpScUfJkIrW{d@jDkm@|~@vA{BmqBe`AwsD_iB_@uBuCfGncAu_C_M}HKslAfD}MtyAfQhi@cjBkw@a_@`Qm_@`Rka@hb@g`@_WvY","ctogW{wv|`ExAPr^ct@{vDmjBa@xAdqDjfBArCsZdp@","u{mgWqbs|`EhAmBdA_F`T{m@i]eO????qWni@{A|C_tGu~C?nA|LtGffHpmD"],["g}vgW_bc}`El\\y|@~KwE`QlAwB`b@OzUq_@rdBeBy@qc@iJ`OioA"]],"a":275.223107,"d":275.21},"17-VSD":{"p":"RAYONG","t":"MultiPolygon","r":[["of~gWqhm~`Eh^nYkMv}@sf@wStUocA"],["uw}gWkij~`EuSdv@ulAyaB`D_Gh|Arr@"],["g~ahWk}h~`Ed_@az@oIqNz@iCzHjFhA]~ExGwAlB~dAtyAh@v@o@zB}BjI}DhE}bBws@"],["qgahWstk~`EfL{NxCbCsFlIu@~FwGuE"],["a|ahWcji~`EpMey@jG`L}Ubl@"]],"a":24.415672,"d":24.41},"18(1)-STC":{"p":"RAYONG","t":"MultiPolygon","r":[["{|xgWgme|`EnL{Wnt@jZ_Qvf@rFxAdDaGjUhGlA|Mq@dHiMrNa@bEoM`SoSd\\g_@wM|My[bWgn@yh@{UjMoRaMgF"],["}_ygWwnd|`Exc@vQiX`j@kh@eTz\\sg@"],["{`ygWioe|`EwWyKhK}WxV~JkJvX"],["wuzgWsjf|`EvKqW~WtKeK`XqXeL"]],"a":21.029977,"d":21.03},"18-STC":{"p":"RAYONG","t":"MultiPolygon","r":[["}dygW_ko}`EhF@dUz_Bqk@OfR}CGu^wc@|@Z`ZyEkBrBi}@|\\mLdDuH"],["si}gW{ko}`EnR|Gt@rXtHhAtAmTje@pPpIuBkCnp@}pA_e@BwH}a@qH~@iXuLwm@xw@nYoE`W"],["skahWu~s}`Epu@vLaArb@fHte@rKdb@{w@|HqXk_B`Gyc@"]],"a":31.631016,"d":31.62},"19-STC":{"p":"RAYONG","t":"MultiPolygon","r":[["mgxgWk~x{`Ec@wLnV}XnDi@r_@|YgT`j@qLjAuXk^","usvgWcjy{`EH?FCDCBG@G?ICGCEeXuUGCGAG?G@EDuXhZEFAH@Hr@dDBFDDFBF@FAFCDEBG@GAGo@wCxWkYpWdUDBF@"],["_zxgWu~y{`EyG]iEcIZsEjq@um@zf@ii@f\\fMwm@|t@CFAF?FBFBFFBF@F?FCDE`n@gu@hC`AmcAjkA_V~VkGd@iJ_K","wowgWesz{`E@I?GCGEEECGAI?GBEB_Wn[CFAF?HBFDDDBF@H?DCFE~Vo[BE"]],"a":15.216339,"d":15.21},"20-STC":{"p":"RAYONG","t":"MultiPolygon","r":[["oipgW{mc|`Efy@k^uFbIah@bVuDtDfNV~EtAcBbCe\\_EfEcH"],["kdqgWw`a|`EqAe@aHt^si@iKw@hEri@vJaBtZoXlPe\\sE{Srm@sfAmSvMgb@lOwChLaN|FgV~L_KrG{JxYiZnV}EvDuHvm@cXjEhAsS~bA","ilqgWaw`|`EqEg@_CbPvDdAxCaQ"]],"a":28.692488,"d":28.69},"21-STC":{"p":"RAYONG","t":"Polygon","r":[["gp{iW{_rcaEsFrWtNjL~n@kw@cKiWpIyd@xi@ql@~WqLbm@`OdAp|@P{AbIz@hNmCtNe[hGI~o@wuCtJ|AwBgAh@aU~IaIrQg@pLvRkBdXz|@lNlw@gzCyaAua@`OcXsaAyq@cMLgMxIaLf{@}f@re@mDh`@oPfBq{Akx@{`@Kyf@rYey@py@F|\\taBlFzXlHrTjf@_BxPi`@`p@}JbLoX`E}PmHgq@qCeOmPvGaWoQ{Ki[jGyHpSId_@pt@by@|HfSnDjbA","cmoiWs{ycaEqEv_@yk@kJtHs^th@fI","gfpiWqm|caErR~LsN`c@gW\\dJwk@`HgE","sgtiWqs{caEhNqB|J~CnJnNeElP{HtHaFR}T}KqAiNzGmO","gjtiWsn|caEcCxImWpZmLXbSye@rEn@fN{@","ahviWu|ycaEnAyKlR}HfIxIbHzAbG`Gh@vGoAjFmBf@iFC}RdE_G}IwDyAyBuG","cbtiW}uvcaEadBet@rCaG|aBpt@oAtF","imxiWgyzcaErJs_@lPnEwKr_@iOoE","{oniWov}caErOnDwR`o@yNlCbAyMsA_UlReT","m|piWeo}caEeJ_J_QqEgNvAcNuJ|AyLnPXfq@b@h]pPcSl^}Op@kCeK","ywpiWkh`daE_BnJqi@wMzC_J`Oi@rWpN","c`qiW{c_daEcj@eBzAmRfj@tG_B|L","euriWet|caEnN{YvEbCrV`IoArSsPxMkTsIkCcK","c}siW_c}caEz@aO|RwQtE~I|GpFiInKcDdH_UmD","{yuiWwh{caEyJqJu@er@nc@fV_Vnf@","mxwiWca~caEsXxgA}BAdYwgAjB?"]],"a":146.468636,"d":146.34},"22(1)-STC":{"p":"RAYONG","t":"Polygon","r":[["m}qiWqfedaEoHff@pb@fJjGdAv@_ExDkNl@sRnYnHNoB~D|AsHhMcUbIyEr@StBdpB~ZzF}Yr@aSgKy@{uB{ZlAxBoOq@wM}B"]],"a":13.061989,"d":13.06},"22-STC":{"p":"RAYONG","t":"Polygon","r":[["ezviW_ipdaEbSfy@|\\jDfAnCbJp|@vfAw`@tjAm{@eKiLcP{b@yBTciA|n@yBcCsKuJyNuNq`@q_@{JiD_BP}Uz`@","}briWa}mdaEqGqJuQwXzo@{b@jWbd@k^jWsMtJ"]],"a":26.05346,"d":26.05},"23(1)-STC":{"p":"RAYONG","t":"Polygon","r":[["o_kdWo|v{`EdAfKuEbMhBfAh[g}AqlAe_@l_@zsA~P|K"]],"a":7.464143,"d":7.46},"23-STC":{"p":"RAYONG","t":"Polygon","r":[["}ecgWedu_aErDbjAj{@t[|X_a@mAc[x\\`D~IqNlM}a@{MwIeg@[}@g@eBkl@gBqi@{CeH~BcDsB{mAagAtnAcC`DyApBdAllB","embgWqit_aEsHU_@eHeEmEnBuHxSbFoGxE^`K","a`cgW_`w_aEhSnAwC|UcMUm@wW","mbcgWsnx_aEvVFn@lQ{WvBKmU"]],"a":42.908141,"d":42.9}};

function decodePolyline(value: string, precision = 6): [number, number][] {
  const factor = 10 ** precision;
  const coordinates: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  const next = () => {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = value.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };

  while (index < value.length) {
    lat += next();
    lng += next();
    coordinates.push([lng / factor, lat / factor]);
  }

  return coordinates;
}

export function getPddBoundary(plotCode: string): {
  provinceCode: "RAYONG" | "CHANTHABURI" | "TRAT";
  geometry: Geometry;
  geometryAreaRai: number;
  declaredAreaRai: number | null;
  source: "pdd_kmz_2026_09_21";
  sourceDate: string;
  sourceSha256: string;
} | null {
  const record = DATA[String(plotCode || "").trim().toUpperCase()];
  if (!record) return null;

  const polygons = record.r.map((rings) =>
    rings.map((encoded) => decodePolyline(encoded))
  );

  const geometry: Geometry =
    record.t === "Polygon"
      ? { type: "Polygon", coordinates: polygons[0] }
      : { type: "MultiPolygon", coordinates: polygons };

  return {
    provinceCode: record.p,
    geometry,
    geometryAreaRai: record.a,
    declaredAreaRai: record.d,
    source: "pdd_kmz_2026_09_21",
    sourceDate: SOURCE_DATE,
    sourceSha256: SOURCE_SHA256
  };
}

export function getPddBoundaryCount(provinceCode?: string) {
  if (!provinceCode) return Object.keys(DATA).length;
  return Object.values(DATA).filter((row) => row.p === provinceCode).length;
}


export function listPddBoundaries(provinceCode?: string) {
  return Object.entries(DATA)
    .filter(([, row]) => !provinceCode || row.p === provinceCode)
    .map(([plotCode, row]) => {
      const decoded = getPddBoundary(plotCode);
      return {
        plotCode,
        provinceCode: row.p,
        geometry: decoded?.geometry || null,
        geometryAreaRai: row.a,
        declaredAreaRai: row.d,
        sourceDate: SOURCE_DATE,
        sourceSha256: SOURCE_SHA256
      };
    })
    .sort((a, b) => a.plotCode.localeCompare(b.plotCode, "en", { numeric: true }));
}
