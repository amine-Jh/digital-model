'use client'

import { use } from 'react'
import { useTestsCatalog } from '@/hooks/use-tests-catalog'
import { getTestForRunner } from '@/lib/tests-catalog'
import { BEERY_VMI_TEST_ID } from '@/lib/beery-vmi'
import { VISUO_CONSTRUCTIVE_TEST_ID } from '@/lib/visuo-constructive'
import { VP_HUB_TEST_ID, getSubtestByTestId } from '@/lib/visuo-perceptive'
import { VPHub } from '@/components/visuo-perceptive/vp-hub'
import { VPSubtestRunner } from '@/components/visuo-perceptive/vp-subtest-runner'
import { SYLLOGISM_TEST_ID } from '@/lib/syllogism-test'
import { RAVENS_TEST_ID } from '@/lib/ravens-test'
import { SPATIAL_ORIENTATION_TEST_ID } from '@/lib/spatial-orientation-test'
import { MENTAL_ROTATION_TEST_ID } from '@/lib/mental-rotation-test'
import { MENTAL_ROTATION_2D_TEST_ID } from '@/lib/mental-rotation-2d-test'
import { MENTAL_CUTTING_TEST_ID } from '@/lib/mental-cutting-test'
import { CORSI_TEST_ID } from '@/lib/corsi-test'
import { DIVIDED_ATTENTION_TEST_ID } from '@/lib/attentional/divided-attention'
import { SELECTIVE_ATTENTION_TEST_ID } from '@/lib/attentional/selective-attention'
import { SUSTAINED_ATTENTION_TEST_ID } from '@/lib/attentional/sustained-attention'
import { TRAIL_MAKING_TEST_ID } from '@/lib/attentional/trail-making'
import { SHIFTING_ATTENTION_TEST_ID } from '@/lib/attentional/shifting-attention'
import { INHIBITION_TEST_ID } from '@/lib/attentional/inhibition'
import { PROCESSING_SPEED_TEST_ID } from '@/lib/attentional/processing-speed'
import { COGNITIVE_FLEXIBILITY_TEST_ID } from '@/lib/attentional/cognitive-flexibility'
import { RAVLT_TEST_ID } from '@/lib/memory/ravlt'
import { DIGIT_SPAN_TEST_ID } from '@/lib/memory/digit-span'
import { DividedAttentionTest } from '@/components/attentional/divided-attention-test'
import { RAVLTTest } from '@/components/memory/ravlt-test'
import { DigitSpanTest } from '@/components/memory/digit-span-test'
import { SelectiveAttentionTest } from '@/components/attentional/selective-attention-test'
import { SustainedAttentionTest } from '@/components/attentional/sustained-attention-test'
import { TrailMakingTest } from '@/components/attentional/trail-making-test'
import { ShiftingAttentionTest } from '@/components/attentional/shifting-attention-test'
import { InhibitionTest } from '@/components/attentional/inhibition-test'
import { ProcessingSpeedTest } from '@/components/attentional/processing-speed-test'
import { CognitiveFlexibilityTest } from '@/components/attentional/cognitive-flexibility-test'
import { BeeryMotriceTest } from '@/components/beery-motrice/beery-motrice-test'
import { VisuoConstructiveTest } from '@/components/visuo-constructive/visuo-constructive-test'
import { SyllogismTest } from '@/components/syllogism/syllogism-test'
import { RavensTest } from '@/components/ravens/ravens-test'
import { SpatialOrientationTest } from '@/components/spatial-orientation/spatial-orientation-test'
import { MentalRotationTest } from '@/components/mental-rotation/mental-rotation-test'
import { MentalRotation2DTest } from '@/components/mental-rotation-2d/mental-rotation-2d-test'
import { MentalCuttingTest } from '@/components/mental-cutting/mental-cutting-test'
import { CorsiTest } from '@/components/corsi/corsi-test'
import { GenericTestRunner } from '@/components/assessment/generic-test-runner'
import { VECTORS_TEST_ID } from '@/lib/geometry/geo-vectors-complete'
import { VectorsQuizTest } from '@/components/geometry/vectors-quiz'
import { SYMETRIE_AXIALE_TEST_ID } from '@/lib/geometry/symetrie-axiale'
import { SymetrieAxialeQuiz } from '@/components/geometry/symetrie-axiale-quiz'
import { TRIG_CIRCLE_TEST_ID } from '@/lib/geometry/trig-unit-circle'
import { TrigCircleQuiz } from '@/components/geometry/trig-circle-quiz'
import { GEO_SPACE_TEST_ID } from '@/lib/geometry/geo-space'
import { GeoSpaceQuiz } from '@/components/geometry/geo-space-quiz'
import { DROITE_PLAN_TEST_ID } from '@/lib/geometry/droite-plan'
import { DroitePlanQuiz } from '@/components/geometry/droite-plan-quiz'
import { SYMETRIE_CENTRALE_TEST_ID } from '@/lib/geometry/symetrie-centrale'
import { SymetrieCentraleQuiz } from '@/components/geometry/symetrie-centrale-quiz'
import { PRODUIT_SCALAIRE_TEST_ID } from '@/lib/geometry/produit-scalaire'
import { ProduitScalaireQuiz } from '@/components/geometry/produit-scalaire-quiz'
import { SPACE_VOLUMES_TEST_ID } from '@/lib/geometry/space-volumes'
import { SpaceVolumesQuiz } from '@/components/geometry/space-volumes-quiz'

interface TestPageProps {
  params: Promise<{ testId: string }>
}

export default function TestPage({ params }: TestPageProps) {
  const { testId } = use(params)
  const { catalog } = useTestsCatalog()
  const test = getTestForRunner(testId, catalog)

  if (testId === BEERY_VMI_TEST_ID) {
    return <BeeryMotriceTest />
  }
  if (testId === VISUO_CONSTRUCTIVE_TEST_ID) {
    return <VisuoConstructiveTest />
  }
  if (testId === VP_HUB_TEST_ID) {
    return <VPHub />
  }
  const vpSubtest = getSubtestByTestId(testId)
  if (vpSubtest) {
    return <VPSubtestRunner subtest={vpSubtest} />
  }
  if (testId === SYLLOGISM_TEST_ID) {
    return <SyllogismTest />
  }
  if (testId === RAVENS_TEST_ID) {
    return <RavensTest />
  }
  if (testId === SPATIAL_ORIENTATION_TEST_ID) {
    return <SpatialOrientationTest />
  }
  if (testId === MENTAL_ROTATION_TEST_ID) {
    return <MentalRotationTest />
  }
  if (testId === MENTAL_ROTATION_2D_TEST_ID) {
    return <MentalRotation2DTest />
  }
  if (testId === MENTAL_CUTTING_TEST_ID) {
    return <MentalCuttingTest />
  }
  if (testId === CORSI_TEST_ID) {
    return <CorsiTest />
  }
  if (testId === DIVIDED_ATTENTION_TEST_ID) {
    return <DividedAttentionTest />
  }
  if (testId === SELECTIVE_ATTENTION_TEST_ID) {
    return <SelectiveAttentionTest />
  }
  if (testId === SUSTAINED_ATTENTION_TEST_ID) {
    return <SustainedAttentionTest />
  }
  if (testId === TRAIL_MAKING_TEST_ID) {
    return <TrailMakingTest />
  }
  if (testId === SHIFTING_ATTENTION_TEST_ID) {
    return <ShiftingAttentionTest />
  }
  if (testId === INHIBITION_TEST_ID) {
    return <InhibitionTest />
  }
  if (testId === PROCESSING_SPEED_TEST_ID) {
    return <ProcessingSpeedTest />
  }
  if (testId === COGNITIVE_FLEXIBILITY_TEST_ID) {
    return <CognitiveFlexibilityTest />
  }
  if (testId === RAVLT_TEST_ID) {
    return <RAVLTTest />
  }
  if (testId === DIGIT_SPAN_TEST_ID) {
    return <DigitSpanTest />
  }
  if (testId === VECTORS_TEST_ID) {
    return <VectorsQuizTest />
  }
  if (testId === SYMETRIE_AXIALE_TEST_ID) {
    return <SymetrieAxialeQuiz />
  }
  if (testId === TRIG_CIRCLE_TEST_ID) {
    return <TrigCircleQuiz />
  }
  if (testId === GEO_SPACE_TEST_ID) {
    return <GeoSpaceQuiz />
  }
  if (testId === DROITE_PLAN_TEST_ID) {
    return <DroitePlanQuiz />
  }
  if (testId === SYMETRIE_CENTRALE_TEST_ID) {
    return <SymetrieCentraleQuiz />
  }
  if (testId === PRODUIT_SCALAIRE_TEST_ID) {
    return <ProduitScalaireQuiz />
  }
  if (testId === SPACE_VOLUMES_TEST_ID) {
    return <SpaceVolumesQuiz />
  }

  return <GenericTestRunner test={test} />
}
