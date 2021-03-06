import test from 'ava'
import { connect } from '../src'

const db = connect(':memory:')

const people = [
  { name: 'Dale', age: 30 },
  { name: 'Lelu', age: 6 },
  { name: 'Gurlak', age: 302 }
]

test.before(async () => {
  await db.model('people', {
    name: String,
    age: Number
  })

  await Promise.all(people.map(person => db.create('people', person)))
})

test.after.always(() => db.close())

test.serial('increments by 1 when no amount is provided', async t => {
  const values = await Promise.all(
    people.map(({ name, age }, i) => {
      people[i].age += 1
      return db.increment('people.age', { name })
        .then(() => db.get<number>('people.age', { name }))
        .then(val => [age, val])
    })
  )

  values.forEach(([age, val]) => t.is(val, age + 1))
})

test.serial('increments by a specified amount', async t => {
  const values = await Promise.all(
    people.map(({ name, age }, i) => {
      people[i].age += 4
      return db.increment('people.age', { name }, 4)
        .then(() => db.get<number>('people.age', { name }))
        .then(val => [age, val])
    })
  )

  values.forEach(([age, val]) => t.is(val, age + 4))
})

test.serial('does nothing when passed a zero value', async t => {
  await db.set('people.age', { name: 'Lelu' }, 10)
  const original = await db.get('people.age', { name: 'Lelu' })
  t.is(original, 10)

  const affected = await db.increment('people.age', { name: 'Lelu' }, 0)
  t.is(affected.length, 0)

  const final = await db.get('people.age', { name: 'Lelu' })
  t.is(final, 10)
})

test('allows for multiple where clauses', async t => {
  const people = await db.model('increment_people', {
    age: Number,
    name: String
  })

  const list = [
    { age: 31, name: 'Joe' },
    { age: 41, name: 'Bob' },
    { age: 51, name: 'Jill' },
    { age: 49, name: 'Jane' }
  ]

  await Promise.all(list.map(p => people.create(p)))

  await people.increment('age', [
    ['age', '>', 45],
    { name: 'Jill' }
  ])

  const results = await Promise.all(
    list.map(({ name }) => people.get('age', { name }))
  )

  t.deepEqual(results, [31, 41, 52, 49])
})
