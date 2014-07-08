#!/usr/bin/env python

from PIL import Image
import colorsys
import json
import math
import optparse
import os
import re


class Space:
    def __init__(self):
        self.data = dict()

    def load(self, filename):
        self.data = dict()
        self.data['features'] = features = list()
        self.data['keywords'] = keywords = dict()

        with open(filename, 'r') as fp:
            space = json.load(fp)

        colors      = space['colorString']
        impressions = space['impressions']

        for color in colors:
            groups = re.split('[\(\)]', color)
            name   = groups[0]
            rgb    = map(lambda x: int(x), groups[1].split(','))
            features.append({
                'name': name,
                'rgb':  rgb,
                'hsv':  colorsys.rgb_to_hsv(*rgb)
            })

        for impression in impressions:
            assert len(colors) == len(impression) - 1
            keywords[impression[0]] = impression[1:]

    def save(self, filename):
        with open(filename, 'w') as fp:
            fp.write('var spaceDefinitions = ')
            json.dump(self.data, fp, indent=4, sort_keys=True)


class Sensor:
    def __init__(self):
        self.space = Space()
        self.rankings = dict()

    def prepare_definitions(self, filename_in, filename_out):
        self.space.load(filename_in)
        self.space.save(filename_out)

    def process_images(self, filenames):
        for filename in filenames:
            self.process_image(filename)

    def process_image(self, filename):
        print 'Processing {0}...'.format(filename)

        image         = Image.open(filename)
        width, height = image.size
        rankings      = list()

        for feature in self.space.data['features']:
            feature_rgb = feature['rgb']
            print '\t{name}...'.format(**feature)

            difference = 0
            for y in xrange(height):
                for x in xrange(width):
                    difference += self.color_distance(image.getpixel((x, y)), feature_rgb)
            rankings.append(difference / (width * height))

        self.rankings[os.path.basename(filename)] = rankings


    def color_distance(self, color1, color2):
        dx = color2[0] - color1[0]
        dy = color2[1] - color1[1]
        dz = color2[2] - color1[2]

        return dx * dx + dy * dy + dz * dz

    def save_database(self, filename):
        with open(filename, 'w') as fp:
            fp.write('var spaceDatabase = ')
            json.dump(self.rankings, fp, indent=4, sort_keys=True)


def main():
    parser = optparse.OptionParser()
    parser.add_option('--space', dest='space', default='space.json')
    parser.add_option('--definitions', dest='definitions', default='definitions.json')
    parser.add_option('--database', dest='database', default='database.json')
    options, filenames = parser.parse_args()

    sensor = Sensor()
    sensor.prepare_definitions(options.space, options.definitions)
    sensor.process_images(filenames)
    sensor.save_database(options.database)


if __name__ == '__main__':
    main()
