import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Curve } from "../redux/storageresults/slice";
const exportCurveAsVerticalTable = (curve: Curve) => {
  const length = curve.pvbtPoints.length; // assumindo que todos os arrays têm o mesmo tamanho

  const rows = [];

  for (let i = 0; i < length; i++) {
    rows.push({
      pvbtPoints: curve.pvbtPoints[i],
      flowratePoints: curve.flowratePoints[i],
      intersticialVelocity: curve.intersticialVelocity[i],
      iDa: curve.iDa[i],
      volumeToBt: curve.volumeToBt[i],
      timeToBt: curve.timeToBt[i],
      wormholeVelocity: curve.wormholeVelocity[i],
      darcyVelocity: curve.darcyVelocity[i],
      length: curve.length,
      diameter: curve.diameter,
      porosity: curve.porosity,
      "Acid Concentration": curve.concentration,
      temperature: curve.temperature,

      "Rock Type": curve.rock,     // só preenche a 1ª linha
      "Acid Type": curve.acid
    });
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Curve_${curve.id}`);

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/octet-stream" });

  saveAs(blob, `curve_${curve.id}.xlsx`);
};

export default exportCurveAsVerticalTable;