// The examples from https://www.calormen.com/jslogo/, plus a few classics

export const PROGRAMS: { name: string; source: string }[] = [
	{
		name: 'Star',
		source: `to star
  repeat 5 [ fd 100 rt 144 ]
end
clearscreen
star`,
	},
	{
		name: 'Random squares',
		source: `to square :length
  repeat 4 [ fd :length rt 90 ]
end
to randomcolor
  setcolor pick [ red orange yellow green blue violet ]
end
clearscreen
repeat 36 [ randomcolor square random 200 rt 10 ]`,
	},
	{
		name: 'Label spiral',
		source: `clearscreen window hideturtle
repeat 144 [
  setlabelheight repcount
  penup
  fd repcount * repcount / 30
  label "Logo
  bk repcount * repcount / 30
  pendown
  rt 10
  wait 5
]
showturtle`,
	},
	{
		name: 'Tree',
		source: `to tree :size
   if :size < 5 [forward :size back :size stop]
   forward :size/3
   left 30 tree :size*2/3 right 30
   forward :size/6
   right 25 tree :size/2 left 25
   forward :size/3
   right 25 tree :size/2 left 25
   forward :size/6
   back :size
end
clearscreen
tree 150`,
	},
	{
		name: 'Fern',
		source: `to fern :size :sign
  if :size < 1 [ stop ]
  fd :size
  rt 70 * :sign fern :size * 0.5 :sign * -1 lt 70 * :sign
  fd :size
  lt 70 * :sign fern :size * 0.5 :sign rt 70 * :sign
  rt 7 * :sign fern :size - 1 :sign lt 7 * :sign
  bk :size * 2
end
window clearscreen pu bk 150 pd
fern 25 1`,
	},
	{
		name: 'Turtle race',
		source: `clearscreen
setturtle 2 penup right 90 forward 100 left 90 pendown
repeat 100 [
  setturtle 1 forward random 4
  setturtle 2 forward random 4
  wait 2
]`,
	},
	{
		name: 'Ice cream choices',
		source: `to choices :menu [:sofar []]
if emptyp :menu [print :sofar stop]
foreach first :menu [(choices butfirst :menu sentence :sofar ?)]
end
choices [[small medium large]
         [vanilla [ultra chocolate] lychee [rum raisin] ginger]
         [cone cup]]`,
	},
	{
		name: 'Koch snowflake',
		source: `to koch :size :depth
  if :depth = 0 [ fd :size stop ]
  koch :size / 3 :depth - 1 lt 60
  koch :size / 3 :depth - 1 rt 120
  koch :size / 3 :depth - 1 lt 60
  koch :size / 3 :depth - 1
end
clearscreen setcolor "blue
pu setxy -150 90 pd rt 90
repeat 3 [ koch 300 4 rt 120 ]`,
	},
	{
		name: 'Rainbow spiral',
		source: `clearscreen hideturtle
for [i 1 180] [
  setcolor item 1 + remainder :i 6 [red orange yellow green blue violet]
  fd :i * 1.5
  rt 59
]`,
	},
]
