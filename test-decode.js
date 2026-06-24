const encoded = "maxlDio}wMr@dAPd@JNzDiDrDeDzHiHk@y@Yi@G[Ai@T}DHq@Pa@bEkDZSp@Mr@Ff@Jx@Zd@Rd@L^Fd@?n@@hAElAYB?ZI\\W~AmATQ^]zFgFzKwJ`C{BzAsAZi@Jg@JSPMLAH@f@Mf@g@j@i@zBuBj@i@h@YFC~AcBQUcCuCk@QoFsHgB{BG[wBiCLbAfBbCdNfRn@z@hFxGzHrKda@nj@`AvAbGzH~@nA`IzKhAjBr@`Bx@hCn@tDVjDFjDGjCWpCa@jCq@dCu@vB_AlB_AvAgArAuBpByDlCc@\\wL`IeEvCuCpBaDpCqLjK_EdE_F`GaFnG_GpGgLnMwBlCaEhFeCnC_LnJuB~BwB`DwHdNaJ~OmKbRkCrDeCfCiD|CgDdD}C`DwClD{OdRoClDoCzDuD|FaAzA]h@kC`E{BzC_C~CcDbEyChEwWnb@aB~BoV~[aC~De@bA{@fBoAjDKV}IhWkE|NcEpNiDhLwAxE]nAiFnQsFfR{EjP_IdVaBxFs@tBm@`B[r@{@dBaAxAuAlBgBtByBnBcDxBuExDgExDoBjB}BjCqOrPm@pB}AdBBJDLBHDFJHZNL?JDHHBJ@F?FENIHGBG@G?yD`EcDjDPJxDbCzBbBFHBL?NWp@yDhKIRmA_AMKaBqAWQyBcBePgMaC_BeEgDWUk@e@iEiDcE}CiA{@uAcAsFkEaCkBSOcEaDCAoA}@uDsCc@_@oByAyC_COKsFiEoB}AgBuAGEMSKQK_@M_@sBuGa@gAO[ZM^S~FyCr@]PINZSJm@XIDi@V{BhAmB`A";

const decodePolyline = (encoded) => {
  const coords = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coords.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return coords;
};

const decoded = decodePolyline(encoded);
console.log(decoded.length);
console.log(decoded[0], decoded[Math.floor(decoded.length/2)], decoded[decoded.length-1]);
