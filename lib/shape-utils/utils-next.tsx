interface Props {
  name: string
}

interface Core {
  id: string
}

interface Instance extends Props, Core {}

const defaults: Props = {
  name: 'Spot',
}

const core: Core = {
  id: '0',
}

class ClassInstance<T extends object = {}> implements Instance {
  id = '0'
  name = 'Spot'

  constructor(
    props: Partial<Props> &
      { [K in keyof T]: K extends keyof Core ? never : T[K] }
  ) {
    Object.assign(this, props)
  }
}

interface InstanceConstructor {
  new <T extends object = {}>(
    props: Partial<Props> &
      { [K in keyof T]: K extends keyof Core ? never : T[K] }
  ): Instance
}

function makeInstance<T extends object = {}>(
  props: Partial<Props> &
    { [K in keyof T]: K extends keyof Core ? never : T[K] } &
    ThisType<ClassInstance>
) {
  return new ClassInstance<T>({ ...defaults, ...props, ...core })
}

function getInstance<T extends object = {}>(
  props: Partial<Props> &
    { [K in keyof T]: K extends keyof Core ? never : T[K] }
) {
  return { ...defaults, ...props, ...core }
}

const instance = getInstance({
  name: 'Steve',
  age: 93,
  wag(this: Instance) {
    return this.name
  },
})

interface AnimalProps {
  name: string
  greet(this: Animal, name: string): string
}

interface AnimalCore {
  id: string
  sleep(this: Animal): void
}

interface Animal extends AnimalProps, AnimalCore {}

const getAnimal = <T extends object>(
  props: Partial<AnimalProps> &
    { [K in keyof T]: K extends keyof AnimalCore ? never : T[K] }
): Animal & T => {
  return {
    // Defaults
    name: 'Animal',
    greet(name) {
      return 'Hey ' + name
    },
    // Overrides
    ...props,
    // Core
    id: 'hi',
    sleep() {},
  }
}

const dog = getAnimal({
  name: 'doggo',
  greet(name) {
    return 'Woof ' + this.name
  },
  wag() {
    return 'wagging...'
  },
})

dog.greet('steve')
dog.wag()
dog.sleep()

class ShapeTest {}

const shapeTest = new ShapeTest()

export default shapeTest

type Greet = (name: string) => string

const greet: Greet = (name: string | number) => {
  return 'hello ' + name
}
