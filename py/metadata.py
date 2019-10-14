#!/usr/bin/env python
# -*- coding: utf-8 -*-

from sys import argv
from json import loads
from requests import get
from mutagen.mp4 import MP4, MP4Tags, MP4Cover

f = '/Users/dmulyavka/Desktop/movie-extractor/Love, Death & Robots/season 1/Love, Death & Robots.s1e6.mp4'
z = '{"name":"When the Yogurt Took Over","cover":"https://m.media-amazon.com/images/M/MV5BMTc1MjIyNDI3Nl5BMl5BanBnXkFtZTgwMjQ1OTI0NzM@._V1_.jpg","plot":"After scientists accidentally breed super-intelligent yogurt, it soon hungers for world domination.","genre":["Animation","Short","Comedy"],"date":"2019-03-15T00:00:00Z","show":"Love, Death & Robots","season":1,"episode":6}'

class DotDict(dict):
	"""dot.notation access to dictionary attributes"""
	__getattr__ = dict.get
	__setattr__ = dict.__setitem__
	__delattr__ = dict.__delitem__

fields = DotDict({
	'name': '\xa9nam',
	'plot': 'desc',
	'date': '\xa9day',
	'genre': '\xa9gen',
	'cover': 'covr',

	# TV show specific fields
	'show': 'tvsh',
	'season': 'tvsn',
	'episode': 'tves'
})

# filename = argv[1]
filename = f
# tags = loads(argv[2])
tags = loads(z)

mp4 = MP4(filename)
mp4.delete()
mp4.tags = MP4Tags()

for field, tag in fields.items():
	if field in tags:
		content = tags[field]

		if field == 'cover':
			content = MP4Cover(get(content).content)

		mp4.tags[tag] = content if isinstance(content, list) else [content]

mp4.save()
