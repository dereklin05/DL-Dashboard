export type MinusTransaction = {
  id: string
  date: string
  amountCents: number
  category: string
  isRecurrent: boolean
}

export type MinusBudget = {
  totalCents?: number
  period?: string
  startDate?: string
  endDate?: string
  rolloverEnabled?: boolean
}

export type MinusData = {
  transactions: MinusTransaction[]
  budget?: MinusBudget
  lastImportedAt?: string
}

const databaseName = 'dl-dashboard-minus'
const databaseVersion = 1

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion)
    request.onerror = () => reject(request.error)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains('transactions'))
        database.createObjectStore('transactions', { keyPath: 'id' })
      if (!database.objectStoreNames.contains('settings'))
        database.createObjectStore('settings')
    }
    request.onsuccess = () => resolve(request.result)
  })
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

export async function getMinusData(): Promise<MinusData> {
  const database = await openDatabase()
  const transaction = database.transaction(
    ['transactions', 'settings'],
    'readonly',
  )
  const transactions = await requestResult(
    transaction.objectStore('transactions').getAll(),
  )
  const budget = await requestResult(
    transaction.objectStore('settings').get('budget'),
  )
  const lastImportedAt = await requestResult(
    transaction.objectStore('settings').get('lastImportedAt'),
  )
  database.close()
  return {
    transactions: (transactions as MinusTransaction[]).sort((a, b) =>
      b.date.localeCompare(a.date),
    ),
    budget: budget as MinusBudget | undefined,
    lastImportedAt: lastImportedAt as string | undefined,
  }
}

export async function saveMinusImport(
  transactions: MinusTransaction[],
  budget?: MinusBudget,
) {
  const database = await openDatabase()
  const transaction = database.transaction(
    ['transactions', 'settings'],
    'readwrite',
  )
  const store = transaction.objectStore('transactions')
  transactions.forEach((entry) => store.put(entry))
  if (budget) transaction.objectStore('settings').put(budget, 'budget')
  transaction
    .objectStore('settings')
    .put(new Date().toISOString(), 'lastImportedAt')
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
  database.close()
}
