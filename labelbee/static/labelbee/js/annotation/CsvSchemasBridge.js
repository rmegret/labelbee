/*
 * Bridge between the classic scripts and the ES module CsvSchemas.js: exposes the namespace `CsvSchemas`
 * (used by the "from /data" loader dialog in AnnotationIO.js and labelBee.js).
 */
import * as CsvSchemas from './CsvSchemas.js';

window.CsvSchemas = CsvSchemas;
