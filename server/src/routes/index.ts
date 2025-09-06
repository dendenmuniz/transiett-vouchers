import { Router } from 'express'
import { router as campaignRouter } from './CampaignRoutes'

const router = Router()
router.use('/', campaignRouter)

export { router }
