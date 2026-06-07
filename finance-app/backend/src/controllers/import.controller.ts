import { Response, NextFunction } from 'express'
import multer from 'multer'
import { AuthRequest } from '../middleware/auth'
import { importService } from '../services/import.service'
import { AppError } from '../middleware/error'

// Multer config: in-memory storage
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ]
    const ext = file.originalname.split('.').pop()?.toLowerCase()

    if (allowed.includes(file.mimetype) || ['csv', 'xlsx', 'xls', 'txt'].includes(ext || '')) {
      cb(null, true)
    } else {
      cb(new Error('Formato de archivo no soportado. Use CSV o Excel.'))
    }
  },
})

export async function importFile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!
    const file = req.file

    if (!file) {
      throw new AppError('No se ha subido ningún archivo', 400)
    }

    const ext = file.originalname.split('.').pop()?.toLowerCase()
    const broker = (req.body.broker as string) || 'myinvestor'
    const source = `${broker}_${ext}`

    let transactions = []

    if (ext === 'csv' || ext === 'txt') {
      transactions = await importService.parseCSV(file.buffer)
    } else if (ext === 'xlsx' || ext === 'xls') {
      transactions = await importService.parseExcel(file.buffer)
    } else {
      throw new AppError('Formato no soportado', 400)
    }

    if (!transactions.length) {
      throw new AppError(
        'No se encontraron transacciones en el archivo. Verifica el formato.',
        400
      )
    }

    const result = await importService.importTransactions(userId, transactions, source)

    res.json({
      message: `Importación completada: ${result.imported} operaciones importadas, ${result.skipped} omitidas`,
      ...result,
    })
  } catch (error) {
    next(error)
  }
}

export async function previewImport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const file = req.file
    if (!file) throw new AppError('No se ha subido ningún archivo', 400)

    const ext = file.originalname.split('.').pop()?.toLowerCase()
    let transactions = []

    if (ext === 'csv' || ext === 'txt') {
      transactions = await importService.parseCSV(file.buffer)
    } else if (ext === 'xlsx' || ext === 'xls') {
      transactions = await importService.parseExcel(file.buffer)
    } else {
      throw new AppError('Formato no soportado', 400)
    }

    // Return preview (first 20 transactions)
    res.json({
      total: transactions.length,
      preview: transactions.slice(0, 20),
    })
  } catch (error) {
    next(error)
  }
}
