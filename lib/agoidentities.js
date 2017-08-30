/**
 * agoidentities.js
 * central location for looking up identity and organization information
 * we use a js file so we can easily require it into other files and also
 * have comments in-line
 */

module.exports = {
  devext: {
    baseUrl: 'https://dc.mapsdevext.arcgis.com',
    opendataUrl: 'https://opendatadev.arcgis.com',
    username: 'dcadmin',
    password: 'dcadmin1',
    orgId: 'LjjARY1mkhxulWPq'
  },
  // QA information - used for devt and testing
  qa: {
    baseUrl: 'https://dc.mapsqa.arcgis.com',
    opendataUrl: 'https://opendataqa.arcgis.com',
    username: 'dcadminqa',
    password: 'dcadminqa1',
    orgId: '97KLIFOSt5CxbiRI'
  }

};
