import React, { useEffect, useRef, useState } from 'react';
import { Selection, coordinator, wasmConnector } from '@uwdata/mosaic-core';
import { Query, dateMonth, isBetween, literal, mean } from '@uwdata/mosaic-sql';
import { MosaicClient } from '@uwdata/mosaic-core';
import { loadCSV } from '@uwdata/mosaic-sql';
import * as vg from '@uwdata/vgplot';




class CountClient extends MosaicClient {
  constructor(opts) {
    const { table, setprec, filter } = opts;
    super(filter);
    this.table = table;
    this.setter = setprec;
  }
  query(filter = []) {
    return Query.select({ precipitation: mean("precipitation") })
      .from(this.table)
      .where(filter);
  }

  queryResult(data) {
    const dataArray = data.toArray();
    dataArray.forEach(element => {
      this.setter(element.precipitation);
    });
    return this;
  }
}


const WeatherViz = () => {
  const plotsRef = useRef(null); 
  const [prec, setprec] = useState(null);
  const precipitationStyle = {
    border: '1px solid #ccc', // a light grey border
    padding: '10px',
    margin: '10px 0',
    textAlign: 'center', // center the text horizontally
    backgroundColor: '#f9f9f9', // a light background color
    borderRadius: '4px', // slightly rounded corners
    // You can add more styles to match your visualization style
  };


  useEffect(() => {
    async function init() {
      const wasm = await wasmConnector({ log: false });
      coordinator().databaseConnector(wasm);

      await coordinator().exec(
        loadCSV("weather", `${window.location}seattle-weather.csv`)
      );

      await coordinator().exec(
        `ALTER TABLE weather ADD COLUMN month INT;
         UPDATE weather SET month = MONTH("date");`,
      );
      
      // Selection scheme
      const selection = Selection.intersect();

      const statsClient = new CountClient({
        setprec: setprec,
        table: "weather",
        filter: selection,
      });
      coordinator().connect(statsClient);

      const vgspec = vg.vconcat(
        vg.hconcat(
          vg.hspace('2em'),
          vg.menu({ from: "weather", column: "weather", label: "Weather", as: selection })
        ),
        vg.vspace(4),
        vg.hconcat(
          vg.plot(
            vg.rectY(
              vg.from("weather", { filterBy: selection }),
              { x: vg.bin("month"), y: vg.count(), fill: "steelblue", inset: 0.5}
            ),
            vg.intervalX({ as: selection }),
            vg.xyDomain(vg.Fixed),
            vg.width(350),
            vg.height(240)
          ),
          vg.hspace('1em'),
          vg.plot(
            vg.dot(
              vg.from("weather", { filterBy: selection }),
              { x: "temp_max", y: "wind", fill: "steelblue", fillOpacity: 0.3, r: 2 }
            ),
            vg.intervalX({ as: selection }),
            vg.xyDomain(vg.Fixed),
            vg.width(350),
            vg.height(240)
          )
        )
      )

      if (plotsRef.current) {
        plotsRef.current.replaceChildren(vgspec);
      }
    }

    init();
  }, []);

  return (
    <div>
    <div ref={plotsRef} id="plots"></div>
    <div style={precipitationStyle}>Average Precipitation: {prec ? prec.toFixed(2) : 'None'}</div>
    </div>
  ); // This div is replaced by the plots through plotsRef communication
};

export default WeatherViz;
