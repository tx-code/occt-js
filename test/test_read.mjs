// End-to-end test: read a STEP box and validate the result structure.
import { readFileSync } from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const factory = require("../dist/occt-js.js");

// Minimal STEP file: a 10x10x10 box
const STEP_BOX = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION((''),'2;1');
FILE_NAME('box.step','2026-03-23',(''),(''),'','','');
FILE_SCHEMA(('AUTOMOTIVE_DESIGN'));
ENDSEC;
DATA;
#1=SHAPE_DEFINITION_REPRESENTATION(#2,#3);
#2=PRODUCT_DEFINITION_SHAPE('',$,#4);
#3=SHAPE_REPRESENTATION('',(#5,#13),#20);
#4=PRODUCT_DEFINITION('','',#6,#7);
#5=AXIS2_PLACEMENT_3D('',#8,#9,#10);
#6=PRODUCT_DEFINITION_FORMATION('','',#11);
#7=PRODUCT_DEFINITION_CONTEXT('',#12,'design');
#8=CARTESIAN_POINT('',(0.,0.,0.));
#9=DIRECTION('',(0.,0.,1.));
#10=DIRECTION('',(1.,0.,0.));
#11=PRODUCT('Box','Box','',(#12));
#12=PRODUCT_CONTEXT('',#14,'mechanical');
#13=MANIFOLD_SOLID_BREP('Box',#15);
#14=APPLICATION_CONTEXT('automotive design');
#15=CLOSED_SHELL('',(#16,#17,#18,#19,#21,#22));
#16=ADVANCED_FACE('',(#23),#30,.T.);
#17=ADVANCED_FACE('',(#24),#31,.T.);
#18=ADVANCED_FACE('',(#25),#32,.T.);
#19=ADVANCED_FACE('',(#26),#33,.T.);
#20=(GEOMETRIC_REPRESENTATION_CONTEXT(3) GLOBAL_UNCERTAINTY_ASSIGNED_CONTEXT((#34)) GLOBAL_UNIT_ASSIGNED_CONTEXT((#35,#36,#37)) REPRESENTATION_CONTEXT('',''));
#21=ADVANCED_FACE('',(#27),#38,.T.);
#22=ADVANCED_FACE('',(#28),#39,.T.);
#23=FACE_OUTER_BOUND('',#40,.T.);
#24=FACE_OUTER_BOUND('',#41,.T.);
#25=FACE_OUTER_BOUND('',#42,.T.);
#26=FACE_OUTER_BOUND('',#43,.T.);
#27=FACE_OUTER_BOUND('',#44,.T.);
#28=FACE_OUTER_BOUND('',#45,.T.);
#30=PLANE('',#46);
#31=PLANE('',#47);
#32=PLANE('',#48);
#33=PLANE('',#49);
#34=UNCERTAINTY_MEASURE_WITH_UNIT(LENGTH_MEASURE(1.E-07),#35,'','');
#35=(CONVERSION_BASED_UNIT('MILLIMETRE',#50)LENGTH_UNIT()NAMED_UNIT(#51));
#36=(NAMED_UNIT(#52)PLANE_ANGLE_UNIT()SI_UNIT($,.RADIAN.));
#37=(NAMED_UNIT(#53)SI_UNIT($,.STERADIAN.)SOLID_ANGLE_UNIT());
#38=PLANE('',#54);
#39=PLANE('',#55);
#40=EDGE_LOOP('',(#56,#57,#58,#59));
#41=EDGE_LOOP('',(#60,#61,#62,#63));
#42=EDGE_LOOP('',(#64,#65,#66,#67));
#43=EDGE_LOOP('',(#68,#69,#70,#71));
#44=EDGE_LOOP('',(#72,#73,#74,#75));
#45=EDGE_LOOP('',(#76,#77,#78,#79));
#46=AXIS2_PLACEMENT_3D('',#80,#81,#82);
#47=AXIS2_PLACEMENT_3D('',#83,#84,#85);
#48=AXIS2_PLACEMENT_3D('',#86,#87,#88);
#49=AXIS2_PLACEMENT_3D('',#89,#90,#91);
#50=LENGTH_MEASURE_WITH_UNIT(LENGTH_MEASURE(1.),#92);
#51=DIMENSIONAL_EXPONENTS(1.,0.,0.,0.,0.,0.,0.);
#52=DIMENSIONAL_EXPONENTS(0.,0.,0.,0.,0.,0.,0.);
#53=DIMENSIONAL_EXPONENTS(0.,0.,0.,0.,0.,0.,0.);
#54=AXIS2_PLACEMENT_3D('',#93,#94,#95);
#55=AXIS2_PLACEMENT_3D('',#96,#97,#98);
#56=ORIENTED_EDGE('',*,*,#99,.F.);
#57=ORIENTED_EDGE('',*,*,#100,.T.);
#58=ORIENTED_EDGE('',*,*,#101,.T.);
#59=ORIENTED_EDGE('',*,*,#102,.F.);
#60=ORIENTED_EDGE('',*,*,#103,.F.);
#61=ORIENTED_EDGE('',*,*,#104,.T.);
#62=ORIENTED_EDGE('',*,*,#105,.T.);
#63=ORIENTED_EDGE('',*,*,#106,.F.);
#64=ORIENTED_EDGE('',*,*,#99,.T.);
#65=ORIENTED_EDGE('',*,*,#107,.T.);
#66=ORIENTED_EDGE('',*,*,#103,.T.);
#67=ORIENTED_EDGE('',*,*,#108,.F.);
#68=ORIENTED_EDGE('',*,*,#101,.F.);
#69=ORIENTED_EDGE('',*,*,#109,.T.);
#70=ORIENTED_EDGE('',*,*,#105,.F.);
#71=ORIENTED_EDGE('',*,*,#110,.F.);
#72=ORIENTED_EDGE('',*,*,#108,.T.);
#73=ORIENTED_EDGE('',*,*,#104,.F.);
#74=ORIENTED_EDGE('',*,*,#110,.T.);
#75=ORIENTED_EDGE('',*,*,#100,.F.);
#76=ORIENTED_EDGE('',*,*,#102,.T.);
#77=ORIENTED_EDGE('',*,*,#109,.F.);
#78=ORIENTED_EDGE('',*,*,#106,.T.);
#79=ORIENTED_EDGE('',*,*,#107,.F.);
#80=CARTESIAN_POINT('',(0.,0.,0.));
#81=DIRECTION('',(0.,0.,-1.));
#82=DIRECTION('',(-1.,0.,0.));
#83=CARTESIAN_POINT('',(0.,0.,10.));
#84=DIRECTION('',(0.,0.,1.));
#85=DIRECTION('',(1.,0.,0.));
#86=CARTESIAN_POINT('',(0.,0.,0.));
#87=DIRECTION('',(-1.,0.,0.));
#88=DIRECTION('',(0.,0.,1.));
#89=CARTESIAN_POINT('',(10.,0.,0.));
#90=DIRECTION('',(1.,0.,0.));
#91=DIRECTION('',(0.,0.,-1.));
#92=(CONVERSION_BASED_UNIT('MILLIMETRE',#111)LENGTH_UNIT()NAMED_UNIT(#51));
#93=CARTESIAN_POINT('',(0.,0.,0.));
#94=DIRECTION('',(0.,-1.,0.));
#95=DIRECTION('',(0.,0.,1.));
#96=CARTESIAN_POINT('',(0.,10.,0.));
#97=DIRECTION('',(0.,1.,0.));
#98=DIRECTION('',(0.,0.,-1.));
#99=EDGE_CURVE('',#112,#113,#114,.T.);
#100=EDGE_CURVE('',#113,#115,#116,.T.);
#101=EDGE_CURVE('',#117,#115,#118,.T.);
#102=EDGE_CURVE('',#112,#117,#119,.T.);
#103=EDGE_CURVE('',#120,#121,#122,.T.);
#104=EDGE_CURVE('',#121,#123,#124,.T.);
#105=EDGE_CURVE('',#125,#123,#126,.T.);
#106=EDGE_CURVE('',#120,#125,#127,.T.);
#107=EDGE_CURVE('',#113,#121,#128,.T.);
#108=EDGE_CURVE('',#112,#120,#129,.T.);
#109=EDGE_CURVE('',#117,#125,#130,.T.);
#110=EDGE_CURVE('',#115,#123,#131,.T.);
#111=LENGTH_MEASURE_WITH_UNIT(LENGTH_MEASURE(1.),#132);
#112=VERTEX_POINT('',#133);
#113=VERTEX_POINT('',#134);
#114=LINE('',#135,#136);
#115=VERTEX_POINT('',#137);
#116=LINE('',#138,#139);
#117=VERTEX_POINT('',#140);
#118=LINE('',#141,#142);
#119=LINE('',#143,#144);
#120=VERTEX_POINT('',#145);
#121=VERTEX_POINT('',#146);
#122=LINE('',#147,#148);
#123=VERTEX_POINT('',#149);
#124=LINE('',#150,#151);
#125=VERTEX_POINT('',#152);
#126=LINE('',#153,#154);
#127=LINE('',#155,#156);
#128=LINE('',#157,#158);
#129=LINE('',#159,#160);
#130=LINE('',#161,#162);
#131=LINE('',#163,#164);
#132=(CONVERSION_BASED_UNIT('MILLIMETRE',#165)LENGTH_UNIT()NAMED_UNIT(#51));
#133=CARTESIAN_POINT('',(0.,0.,0.));
#134=CARTESIAN_POINT('',(10.,0.,0.));
#135=CARTESIAN_POINT('',(0.,0.,0.));
#136=VECTOR('',#166,1.);
#137=CARTESIAN_POINT('',(10.,0.,10.));
#138=CARTESIAN_POINT('',(10.,0.,0.));
#139=VECTOR('',#167,1.);
#140=CARTESIAN_POINT('',(0.,0.,10.));
#141=CARTESIAN_POINT('',(0.,0.,10.));
#142=VECTOR('',#168,1.);
#143=CARTESIAN_POINT('',(0.,0.,0.));
#144=VECTOR('',#169,1.);
#145=CARTESIAN_POINT('',(0.,10.,0.));
#146=CARTESIAN_POINT('',(10.,10.,0.));
#147=CARTESIAN_POINT('',(0.,10.,0.));
#148=VECTOR('',#170,1.);
#149=CARTESIAN_POINT('',(10.,10.,10.));
#150=CARTESIAN_POINT('',(10.,10.,0.));
#151=VECTOR('',#171,1.);
#152=CARTESIAN_POINT('',(0.,10.,10.));
#153=CARTESIAN_POINT('',(0.,10.,10.));
#154=VECTOR('',#172,1.);
#155=CARTESIAN_POINT('',(0.,10.,0.));
#156=VECTOR('',#173,1.);
#157=CARTESIAN_POINT('',(10.,0.,0.));
#158=VECTOR('',#174,1.);
#159=CARTESIAN_POINT('',(0.,0.,0.));
#160=VECTOR('',#175,1.);
#161=CARTESIAN_POINT('',(0.,0.,10.));
#162=VECTOR('',#176,1.);
#163=CARTESIAN_POINT('',(10.,0.,10.));
#164=VECTOR('',#177,1.);
#165=LENGTH_MEASURE_WITH_UNIT(LENGTH_MEASURE(1.),#178);
#166=DIRECTION('',(1.,0.,0.));
#167=DIRECTION('',(0.,0.,1.));
#168=DIRECTION('',(1.,0.,0.));
#169=DIRECTION('',(0.,0.,1.));
#170=DIRECTION('',(1.,0.,0.));
#171=DIRECTION('',(0.,0.,1.));
#172=DIRECTION('',(1.,0.,0.));
#173=DIRECTION('',(0.,0.,1.));
#174=DIRECTION('',(0.,1.,0.));
#175=DIRECTION('',(0.,1.,0.));
#176=DIRECTION('',(0.,1.,0.));
#177=DIRECTION('',(0.,1.,0.));
#178=(LENGTH_UNIT()NAMED_UNIT(#51)SI_UNIT(.MILLI.,.METRE.));
ENDSEC;
END-ISO-10303-21;`;

async function main() {
  const m = await factory();
  const bytes = new TextEncoder().encode(STEP_BOX);

  console.log("=== Reading STEP box ===");
  const result = m.ReadStepFile(bytes, {
    linearDeflection: 0.1,
    angularDeflection: 0.5,
    readNames: true,
    readColors: true,
  });

  console.log("success:", result.success);
  if (!result.success) {
    console.log("error:", result.error);
    process.exit(1);
  }

  console.log("\n=== Stats ===");
  const s = result.stats;
  console.log("rootCount:", s.rootCount);
  console.log("nodeCount:", s.nodeCount);
  console.log("partCount:", s.partCount);
  console.log("geometryCount:", s.geometryCount);
  console.log("triangleCount:", s.triangleCount);

  console.log("\n=== Root nodes ===");
  console.log("rootNodes count:", result.rootNodes.length);
  for (const node of result.rootNodes) {
    console.log(`  node: id=${node.id}, name="${node.name}", isAssembly=${node.isAssembly}, meshIndex=${node.meshIndex}`);
  }

  console.log("\n=== Geometries ===");
  console.log("geometries count:", result.geometries.length);
  for (const geo of result.geometries) {
    console.log(`  geo: id=${geo.id}, positions=${geo.positions.length}, normals=${geo.normals?.length ?? 0}, indices=${geo.indices.length}`);
  }

  console.log("\n=== Materials ===");
  console.log("materials count:", result.materials.length);

  console.log("\n=== PASS ===");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
