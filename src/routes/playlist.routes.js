import Router from 'express';
import {verifyJWT} from '../middlewares/auth.middleware.js';
import { 
    createPlaylist, 
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    getUserPlaylists,
    getPlaylistById,
    togglePlaylistVisibility
 } from '../controllers/playlist.controller.js';

const router = Router();

router.route('/:playlistId').get(getPlaylistById);

router.use(verifyJWT);

router.route('/').post(createPlaylist);
router.route('/me').get(getUserPlaylists);
router.route('/:playlistId').delete(deletePlaylist);
router.route('/:playlistId/videos/:videoId').post(addVideoToPlaylist).delete(removeVideoFromPlaylist);
router.route('/:playlistId/visibility').patch(togglePlaylistVisibility);

export default router;