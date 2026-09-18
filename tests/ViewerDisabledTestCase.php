<?php

namespace Packstub\SessionReplay\Tests;

/** The routes register at boot, so turning the pages off has to happen before it. */
abstract class ViewerDisabledTestCase extends TestCase
{
    protected function defineEnvironment($app): void
    {
        parent::defineEnvironment($app);

        $app['config']->set('session-replay.viewer.enabled', false);
    }
}
