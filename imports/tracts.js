var async      = require('async');
var csv        = require('csv');
var util       = require('util');

var Tract = require('../models').Tract;

exports.importTracts = function() {
  var metadata;

  var tractsJsonImport = function(done) {
    Tract.remove({}, function(err) {
      if (err) console.log(err);
      else {
        var tracts = require('../data/census/tract.json');
        var total = tracts.features.length;
        var soFar = 0;
        tracts.features.forEach(function(tract) {
          newTract = new Tract({
            tractId: tract.properties.GEOID10,
            loc: {
              type:         tract.geometry.type,
              coordinates:  tract.geometry.coordinates
            }
          });
          newTract.save(function(err) {
            soFar++;
            if (soFar === total) {
              console.log('Done importing geocoordinates');
              done();
            } else {
              console.log('Imported ' + soFar);
            }
          });
        });
      }
    });
  }

  var metadataImport = function(done) {
    metadata = require('../data/census/sf1_labels.json');
    console.log('done importing metadata');
    done();
  }

  var familiesImport = function(done) {
    var total = 0, soFar = 0;

    csv().
      from.path(__dirname+'/../data/census/all_140_in_37.P35.csv', {columns: true}).
      on('record', function(row, index) {
        total++;
        var data = {
          totalPopulations: [
            {year: 2000, count: row['POP100.2000']},
            {year: 2010, count: row['POP100']}
          ],
          numHouseholds: [
            {year: 2000, count: row['HU100.2000']},
            {year: 2010, count: row['HU100']}
          ],
          numFamilies: [
            {year: 2000, count: row['P035001.2000']},
            {year: 2010, count: row['P035001']}
          ]
        }
        Tract.update({tractId: row.GEOID}, data, function(err,tract) {
          soFar++;
          if (err) console.log(err);
          else {
            console.log('Population import: ' + soFar);
          }

          if (soFar === total) {
            console.log('done importing populating');
            done();
          }
        });
      });
  };

  var averageHouseholdSizesByAgeImport = function(done) {
  };

  var gendersByAgeImport = function(done) {
  };

  async.series([tractsJsonImport, metadataImport, familiesImport]);

};
